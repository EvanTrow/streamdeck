import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from '@elgato/streamdeck';
import { currentDesktop, desktopSwitchPipe } from '../plugin';

const logger = streamDeck.logger;

let listener: (newValue: string, oldValue: string) => void;

const isConfigured = (settings: DesktopToggleSettings) => {
	return (settings?.desktop1 ?? '').trim().length > 0 && (settings?.desktop2 ?? '').trim().length > 0;
};

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: 'tech.trowbridge.streamdeck.desktoptoggle' })
export class DesktopToggle extends SingletonAction<DesktopToggleSettings> {
	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link DesktopToggle.onKeyDown}.
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

	onWillDisappear(ev: WillDisappearEvent<DesktopToggleSettings>): void | Promise<void> {
		currentDesktop.unwatch(listener);
	}

	updateButton(newValue: string, ev: WillAppearEvent<DesktopToggleSettings>) {
		if (newValue.trim() === this.settings.desktop1) {
			ev.action.setImage('imgs/actions/desktoptoggle/windows');
		} else if (newValue.trim() === this.settings.desktop2) {
			ev.action.setImage('imgs/actions/desktoptoggle/crestwood');
		}
	}

	settings: DesktopToggleSettings = {
		desktop1: '',
		desktop2: '',
	};
	onDidReceiveSettings(ev: DidReceiveSettingsEvent<DesktopToggleSettings>): void | Promise<void> {
		this.settings = ev.payload.settings;
	}

	desktopSwitchCommand = (command: string) => {
		try {
			if (desktopSwitchPipe) desktopSwitchPipe.stdin.write(`${command}\n`);
		} catch (error) {
			logger.error(String(error));
		}
	};

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
	 * settings using `setSettings` and `getSettings`.
	 */
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
