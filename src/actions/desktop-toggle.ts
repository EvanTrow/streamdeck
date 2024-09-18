import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from '@elgato/streamdeck';
import { currentDesktop, desktopSwitchPipe } from '../plugin';

const logger = streamDeck.logger;

let listener: (newValue: string, oldValue: string) => void;

const isConfigured = (settings: DesktopToggleSettings) => {
	return (settings?.desktop1 ?? '').trim().length > 0 && (settings?.desktop2 ?? '').trim().length > 0;
};

@action({ UUID: 'tech.trowbridge.streamdeck.desktoptoggle' })
export class DesktopToggle extends SingletonAction<DesktopToggleSettings> {
	settings: DesktopToggleSettings = {
		desktop1: '',
		desktop2: '',
	};

	/**
	 * Handles the initialization of the action.
	 * Initializes the settings, updates the button image based on the current desktop, and sets up a listener to watch for desktop changes.
	 */
	async onWillAppear(ev: WillAppearEvent<DesktopToggleSettings>) {
		this.settings = ev.payload.settings;
		this.updateButton(currentDesktop.value, ev);

		listener = (newValue: string, oldValue: string) => {
			logger.info(`Desktop changed from ${oldValue} to ${newValue}`);
			this.updateButton(newValue, ev);
		};
		currentDesktop.watch(listener);
	}

	// Clean up when action is removed from the Canvas
	onWillDisappear(ev: WillDisappearEvent<DesktopToggleSettings>): void | Promise<void> {
		currentDesktop.unwatch(listener);
	}

	// Updates the button image based on the current desktop.
	updateButton(newValue: string, ev: WillAppearEvent<DesktopToggleSettings>) {
		if (newValue.trim() === this.settings.desktop1) {
			ev.action.setImage('imgs/actions/desktoptoggle/windows');
		} else if (newValue.trim() === this.settings.desktop2) {
			ev.action.setImage('imgs/actions/desktoptoggle/crestwood');
		}
	}

	// update settings when changed
	onDidReceiveSettings(ev: DidReceiveSettingsEvent<DesktopToggleSettings>): void | Promise<void> {
		this.settings = ev.payload.settings;
	}

	// Sends command powershell to switch to the specified desktop.
	desktopSwitchCommand = (command: string) => {
		try {
			if (desktopSwitchPipe) desktopSwitchPipe.stdin.write(`${command}\n`);
		} catch (error) {
			logger.error(String(error));
		}
	};

	// Handles key press of the action. Switches between the two configured desktops based on the current desktop.
	async onKeyDown(ev: KeyDownEvent<DesktopToggleSettings>): Promise<void> {
		const { settings } = ev.payload;

		if (settings && isConfigured(settings)) {
			if (currentDesktop.value.trim() === settings.desktop1) {
				ev.action.setImage('imgs/actions/desktoptoggle/crestwood');
				logger.info(`Switching to desktop: ${settings.desktop2}`);
				this.desktopSwitchCommand(`Switch-Desktop -Desktop ${settings.desktop2}\n`);
			} else {
				ev.action.setImage('imgs/actions/desktoptoggle/windows');
				logger.info(`Switching to desktop: ${settings.desktop1}`);
				this.desktopSwitchCommand(`Switch-Desktop -Desktop ${settings.desktop1}\n`);
			}
		}
	}
}

/**
 * Settings for {@link DesktopToggle}.
 */
type DesktopToggleSettings = {
	desktop1?: string;
	desktop2?: string;
};
