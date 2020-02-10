/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { sprintf } from 'sprintf-js';
import { basename } from 'path';
import { getProcesses } from './processTree';


//---- extension.pickNodeProcess

interface ProcessItem extends vscode.QuickPickItem {
	pidOrPort: string;	// picker result
	sortKey: number;
}

/**
 * Process picker command (for launch config variable)
 * Returns as a string with these formats:
 * - "12345": process id
 * - "inspector12345": port number and inspector protocol
 * - "legacy12345": port number and legacy protocol
 * - null: abort launch silently
 */
export function pickProcess(): Promise<string | null> {

	return listProcesses().then(items => {
		console.log(items)
		let options: vscode.QuickPickOptions = {
			placeHolder: "Pick the process to attach to",
			matchOnDescription: true,
			matchOnDetail: true
		};
		return vscode.window.showQuickPick(items, options).then(item => item ? item.pidOrPort : null);
	}).catch(err => {
		return vscode.window.showErrorMessage("Process picker failed ({0})", { modal: true }).then(_ => null);
	});
}

//---- private

function listProcesses(): Promise<ProcessItem[]> {

	const items: ProcessItem[] = [];

	const PROCESS = new RegExp('^cells|cells-enterprise$', 'i');

	let seq = 0;	// default sort key

	return getProcesses((pid: number, ppid: number, command: string, args: string, date?: number) => {

		if (process.platform === 'win32' && command.indexOf('\\??\\') === 0) {
			// remove leading device specifier
			command = command.replace('\\??\\', '');
		}

		const executable_name = basename(command, '.exe');

		if (PROCESS.test(executable_name)) {
			let argsToShow = [];

			const argsArray =args.split(" ")
			let i: string | undefined = ''
			while ( (i = argsArray.shift()) !== undefined) {
				if (!i.startsWith("--")) {
					argsToShow.push(i)
				}
			}
			items.push({
				// render data
				label: executable_name,
				description: sprintf("process id: %s", pid),
				detail: argsToShow.join(" "),

				// picker result
				pidOrPort: pid.toString(),
				// sort key
				sortKey: pid
			});
		}
		
	}).then(() => items.sort((a, b) => a.sortKey - b.sortKey));		// sort items by process id, newest first
}