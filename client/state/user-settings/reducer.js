/**
 * External dependencies
 */

import { omit } from 'lodash';

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

export const settings = ( state = {}, { type, settingValues } ) =>
	USER_SETTINGS_SAVE_SUCCCESS === type ? { ...state, ...settingValues } : state;

export const unsavedSettings = ( state = {}, action ) => {
	switch ( action.type ) {
		case USER_SETTINGS_UNSAVED_CLEAR:
			// After a successful save, remove the saved settings (either all of them,
			// or a subset) from the `unsavedSettings`.
			if ( ! action.settingNames ) {
				return {};
			}
			return omit( state, action.settingNames );

		case USER_SETTINGS_UNSAVED_SET:
			if ( state[ action.settingName ] === action.value ) {
				return state;
			}
			return { ...state, [ action.settingName ]: action.value };

		case USER_SETTINGS_UNSAVED_REMOVE:
			return omit( state, action.settingName );

		default:
			return state;
	}
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
