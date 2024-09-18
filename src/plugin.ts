import streamDeck, { LogLevel } from '@elgato/streamdeck';
import { DesktopToggle } from './actions/desktop-toggle';

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { WatchedVariable } from './WatchedVariable';

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.INFO);
const logger = streamDeck.logger;

/**
 * Parses the current desktop name from the PowerShell output.
 * @returns The current desktop name, or `undefined` if it could not be parsed.
 */
function getDesktopNameFromPsOutput(): string | undefined {
	let powershellOutput = psOutput.join('').split('Get-DesktopName; Write-Output')?.[1] ?? '';
	let m;
	if ((m = /'desktop-name:(?!\$)(.+?)'/.exec(powershellOutput)) !== null) {
		for (let index = 0; index < m.length; index++) {
			const match = m[index];
			if (index === 1) {
				return match ?? null;
			}
		}
		return undefined;
	}
}

/**
 * Starts a PowerShell session and listens for desktop switch events, updating the `currentDesktop` variable with the current desktop name.
 *
 * This function spawns a new PowerShell process, listens for output on its stdout and stderr streams, and parses the desktop name from the output.
 * The function will automatically restart the PowerShell session if it exits for any reason.
 */
let psHeader: string;
let psOutput: string[] = [];
export let desktopSwitchPipe: ChildProcessWithoutNullStreams | undefined;
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
			// remove PowerShell header (first output "PS D:\data>" )
			output = output.replace(psHeader, '');

			// keep last 5 outputs for desktop name parsing
			psOutput.push(output);
			if (psOutput.length > 5) {
				psOutput.shift();
			}

			// let desktop name from powershell output
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

// Retrieves the name of the current desktop and update the `currentDesktop` variable every 1 second
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
