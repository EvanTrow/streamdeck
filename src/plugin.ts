import streamDeck, { LogLevel } from '@elgato/streamdeck';

import { DesktopToggle } from './actions/desktop-toggle';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { WatchedVariable } from './actions/WatchedVariable';

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.INFO);
const logger = streamDeck.logger;

function getDesktopNameFromPsOutput(): string | undefined {
	let powershellOutput = psOutput.join('').split('Get-DesktopName; Write-Output')?.[1] ?? '';

	let m;
	if ((m = /'desktop-name:(?!\$)(.+?)'/.exec(powershellOutput)) !== null) {
		// The result can be accessed through the `m`-variable.

		for (let index = 0; index < m.length; index++) {
			const match = m[index];
			if (index === 1) {
				return match ?? null;
			}
		}
		return undefined;
	}
}

export let desktopSwitchPipe: ChildProcessWithoutNullStreams | undefined;
let psHeader: string;
let psOutput: string[] = [];
function startDesktopSwitchCommandStream() {
	logger.info('Starting powershell session');
	desktopSwitchPipe = spawn('powershell.exe', ['-NoLogo'], { stdio: 'pipe' });

	desktopSwitchPipe.on('close', (code) => {
		logger.info('Powershell session exited with code', code);
		startDesktopSwitchCommandStream();
	});

	desktopSwitchPipe.stdout.on('data', (data) => {
		let output: string = data.toString().trim();
		if (!psHeader) {
			psHeader = output;
		} else {
			output = output.replace(psHeader, '');

			psOutput.push(output);
			if (psOutput.length > 5) {
				psOutput.shift();
			}

			let desktopName = getDesktopNameFromPsOutput();
			if (desktopName) currentDesktop.value = desktopName;
		}
	});

	desktopSwitchPipe.stderr.on('data', (data) => {
		let output: string = data.toString().trim();
		output = output.replace(psHeader, '');
		if (output.length > 0) {
			logger.info(`PS> ${output.toString()}`);
		}
	});
}
startDesktopSwitchCommandStream();

// let currentDesktop: string;

// Usage example
export const currentDesktop = new WatchedVariable<string>('');
function watchCurrentDesktop() {
	setInterval(() => {
		if (desktopSwitchPipe) desktopSwitchPipe.stdin.write(`$desktopName = Get-DesktopName; Write-Output "'desktop-name:$desktopName'"\n`);
	}, 1000);
}
watchCurrentDesktop();

// Register the increment action.
streamDeck.actions.registerAction(new DesktopToggle());

// Finally, connect to the Stream Deck.
streamDeck.connect();
