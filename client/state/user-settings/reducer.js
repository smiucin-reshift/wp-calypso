/**
 * External dependencies
 */

import { get } from 'lodash';

/**
 * Internal dependencies
 */
import {
	USER_SETTINGS_SAVE,
	USER_SETTINGS_UNSAVED_CLEAR,
	USER_SETTINGS_UNSAVED_REMOVE,
	USER_SETTINGS_UNSAVED_SET,
	USER_SETTINGS_SAVE_SUCCCESS,
	USER_SETTINGS_SAVE_FAILURE,
} from 'calypso/state/action-types';
import { combineReducers } from 'calypso/state/utils';
import { setValue, removeValue } from './helpers';

export const settings = ( state = {}, { type, settingValues } ) =>
	USER_SETTINGS_SAVE_SUCCCESS === type ? { ...state, ...settingValues } : state;

export const unsavedSettings = ( state = {}, action ) => {
	switch ( action.type ) {
		case USER_SETTINGS_UNSAVED_CLEAR: {
			const settingNames = action.settingNames;

			if ( ! settingNames ) {
				return {};
			}

			if ( Array.isArray( settingNames ) ) {
				return settingNames.reduce( removeValue, state );
			}

			return removeValue( state, settingNames );
		}
		case USER_SETTINGS_UNSAVED_SET: {
			if ( get( state, action.settingName ) === action.value ) {
				return state;
			}
			return setValue( state, action.settingName, action.value );
		}
		case USER_SETTINGS_UNSAVED_REMOVE: {
			return removeValue( state, action.settingName );
		}
	}
	return state;
};

export const updatingPassword = ( state = false, action ) => {
	switch ( action.type ) {
		case USER_SETTINGS_SAVE: {
			return !! action.settingsOverride?.password;
		}
		case USER_SETTINGS_SAVE_SUCCCESS:
		case USER_SETTINGS_SAVE_FAILURE: {
			return false;
		}
	}
	return state;
};

export const updating = ( state = false, action ) => {
	switch ( action.type ) {
		case USER_SETTINGS_SAVE: {
			return true;
		}
		case USER_SETTINGS_SAVE_SUCCCESS:
		case USER_SETTINGS_SAVE_FAILURE: {
			return false;
		}
	}
	return state;
};

export default combineReducers( {
	settings,
	unsavedSettings,
	updatingPassword,
	updating,
} );
