import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFlipper } from '@react-navigation/devtools';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { DEV_RESTORE_NAV_STATE_ON_RELOAD } from '../../config';
import { navigationRef, navigatorIsReadyRef } from './NavigationService';
import Navigator from './Navigator';
import navTheme from './theme';
import Logger from '../utils/logger';
import * as Sentry from '@sentry/react-native';
import type { SeverityLevel } from '@sentry/types';
import { sentryRoutingInstrumentation } from '../utils/sentry';
import WelcomeScreen from '../screens/WelcomeScreen';

const PERSISTENCE_KEY = 'NAVIGATION_STATE';

// @ts-ignore
export const getActiveRouteName = (state: NavigationState) => {
  const route = state.routes[state.index];

  if (route.state) {
    // @ts-ignore Dive into nested navigators
    return getActiveRouteName(route.state);
  }

  return route.name;
};

const RESTORE_STATE = __DEV__ && DEV_RESTORE_NAV_STATE_ON_RELOAD;

export const NavigatorWrapper = () => {
  const [isReady, setIsReady] = React.useState(RESTORE_STATE ? false : true);
  const [initialState, setInitialState] = React.useState();
  const routeNameRef = React.useRef();

  useFlipper(navigationRef);

  React.useEffect(() => {
    if (navigationRef && navigationRef.current) {
      const state = navigationRef.current.getRootState();

      if (state) {
        // Save the initial route name
        routeNameRef.current = getActiveRouteName(state);
      }
    }
  }, []);

  React.useEffect(() => {
    const restoreState = async () => {
      const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
      if (savedStateString) {
        try {
          const state = JSON.parse(savedStateString);

          setInitialState(state);
        } catch (e: any) {
          Logger.error('NavigatorWrapper', 'Error getting nav state', e);
        }
      }
      setIsReady(true);
    };

    if (!isReady) {
      restoreState().catch((error) =>
        Logger.error('NavigatorWrapper', 'Error persisting nav state', error)
      );
    }
  }, [isReady]);

  React.useEffect(() => {
    return () => {
      navigatorIsReadyRef.current = false;
    };
  }, []);

  if (!isReady) {
    return null;
  }

  const handleStateChange = (state: NavigationState | undefined) => {
    if (state === undefined) {
      return;
    }

    if (RESTORE_STATE) {
      AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state)).catch((error) =>
        Logger.error('NavigatorWrapper', 'Error persisting nav state', error)
      );
    }

    const previousRouteName = routeNameRef.current;
    const currentRouteName = getActiveRouteName(state);

    if (previousRouteName !== currentRouteName) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Navigated to ${currentRouteName}`,
        level: 'info' as SeverityLevel,
      });
    }

    // Save the current route name for later comparision
    routeNameRef.current = currentRouteName;
  };

  const onReady = () => {
    navigatorIsReadyRef.current = true;
    sentryRoutingInstrumentation.registerNavigationContainer(navigationRef);
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onReady}
      onStateChange={handleStateChange}
      initialState={initialState}
      theme={navTheme}
    >
      <View style={styles.container}>
        <WelcomeScreen />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});

export default NavigatorWrapper;
