import * as Keychain from 'react-native-keychain';
import { PinType } from '../types';
import i18n from '../../i18n';
import { navigate, navigateBack } from '../../navigation/NavigationService';
import { Screens } from '../../navigation/Screens';
import { SecretCache, clearPasswordCaches, getCachedPin, setCachedPin } from './PasswordCache';
import {
  isUserCancelledError,
  removeStoredItem,
  resetKeychainValue,
  retrieveStoredKeychainItem,
  storeKeychainItem,
} from '../keychain';
import Logger from '../logger';
import { sleep } from '../helpers';
import { useStoreState } from '../../state/hooks';
import mmkvStorage, { StorageItem } from '../../storage/disk';
import store from '../../state/store';
import { ok } from '../result';

const TAG = 'pincode/authentication';

const PIN_STORAGE_KEY = 'PIN';

export const PIN_LENGTH = 6;
export const DEFAULT_CACHE_ACCOUNT = 'etta';
export const CANCELLED_PIN_INPUT = 'CANCELLED_PIN_INPUT';
export const BIOMETRY_VERIFICATION_DELAY = 800;

const PIN_BLOCKLIST = [
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '123456',
  '654321',
];

export function isPinValid(pin: string) {
  return /^\d{6}$/.test(pin) && !PIN_BLOCKLIST.includes(pin);
}

function storePinWithBiometry(pin: string) {
  return storeKeychainItem({
    key: PIN_STORAGE_KEY,
    value: pin,
    options: {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
    },
  });
}

export const removeStoredPin = async (): Promise<void> => {
  // remove PIN in storage
  removeStoredItem(PIN_STORAGE_KEY);
  resetKeychainValue({ key: 'pin' });
  // mark Pin unset
  store.dispatch.nuxt.setPincodeType(PinType.Unset);
};

type PinCallback = (pin: string) => void;

export async function setPincodeWithBiometry() {
  let pin = getCachedPin(DEFAULT_CACHE_ACCOUNT);
  // let pinCache: any = mmkvStorage.getItem(StorageItem.pinCache);
  // let pin = pinCache[DEFAULT_CACHE_ACCOUNT].secret;
  if (!pin) {
    pin = await requestPincodeInput(true, true);
  }

  try {
    // storeItem can be called multiple times with the same key, so stale keys
    // from previous app installs/failed save attempts will be overwritten
    // safely here
    await storePinWithBiometry(pin);
    // allow native biometry verification animation to run fully
    await sleep(BIOMETRY_VERIFICATION_DELAY);
    return ok('');
  } catch (error) {
    Logger.warn(TAG, 'Failed to save pin with biometry', error);
    throw error;
  }
}

export async function getPincodeWithBiometry() {
  try {
    const retrievedPin = await retrieveStoredKeychainItem(PIN_STORAGE_KEY, {
      // only displayed on Android - would be displayed on iOS too if we allow
      // device pincode fallback
      authenticationPrompt: {
        title: i18n.t('unlockWithBiometryPrompt')!,
      },
    });
    if (retrievedPin) {
      setCachedPin(DEFAULT_CACHE_ACCOUNT, retrievedPin);
      // allow native biometry verification animation to run fully
      await sleep(BIOMETRY_VERIFICATION_DELAY);
      return retrievedPin;
    }
    throw new Error('Failed to retrieve pin with biometry, recieved null value');
  } catch (error) {
    Logger.warn(TAG, 'Failed to retrieve pin with biometry', error);
    throw error;
  }
}

// Retrieve the pincode value
// May trigger the pincode enter screen
export const getPincode = async (withVerification = true) => {
  const cachedPin = getCachedPin(DEFAULT_CACHE_ACCOUNT);
  if (cachedPin) {
    return cachedPin;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const pincodeType = useStoreState((state) => state.nuxt.pincodeType);
  if (pincodeType === PinType.Device) {
    try {
      const retrievedPin = await getPincodeWithBiometry();
      return retrievedPin;
    } catch (error: any) {
      // do not return here, the pincode input is the user's fallback if
      // biometric auth fails
      if (!isUserCancelledError(error)) {
        Logger.warn(TAG, 'Failed to retrieve pin with biometry', error);
      }
    }
  }

  const pin = await requestPincodeInput(withVerification, true);
  return pin;
};

// Navigate to the pincode enter screen and check pin
export async function requestPincodeInput(
  withVerification = true,
  shouldNavigateBack = true,
  account?: string
) {
  const pin = await new Promise((resolve: PinCallback, reject: (error: string) => void) => {
    navigate(Screens.EnterPinScreen, {
      onSuccess: resolve,
      onCancel: () => reject(CANCELLED_PIN_INPUT),
      withVerification,
      account,
    });
  });

  if (shouldNavigateBack) {
    navigateBack();
  }

  if (!pin) {
    throw new Error('Pincode confirmation returned empty pin');
  }

  setCachedPin(DEFAULT_CACHE_ACCOUNT, pin);
  return pin;
}

// Confirm pin is correct by checking it against the stored password hash
export async function checkPin(pin: string, account: string) {
  const secretCache: SecretCache = await mmkvStorage.getItem(StorageItem.pinCache);
  const cachedSecret = secretCache[account]?.secret;

  return cachedSecret === pin;
}

export const updatePin = async (newPin: string) => {
  try {
    clearPasswordCaches();
    setCachedPin(DEFAULT_CACHE_ACCOUNT, newPin);
    const pincodeType = store.getState().nuxt.pincodeType;
    // see if biometrics are enabled
    if (pincodeType === PinType.Device) {
      await storePinWithBiometry(newPin);
    }
    return true;
  } catch (error: any) {
    Logger.error(`${TAG}@updatePin`, 'Error updating pin', error);
    return false;
  }
};

export async function removeAccountLocally() {
  clearPasswordCaches();
  return Promise.all([removeStoredItem(PIN_STORAGE_KEY)]);
}
