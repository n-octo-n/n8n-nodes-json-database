import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import {
	existsSync,
	readFileSync,
	writeFileSync,
	mkdirSync,
	rmSync,
} from 'fs';

const _ = require('../../lib/lodash.custom.min.js');

export interface IJsonObject {[key: string]: any};

// <https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep#39914235>
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function handleJsonOperation(execFunctions: IExecuteFunctions, itemIndex: number, options: IJsonObject): Promise<IJsonObject> {
	const lockTime = 20000;
	let queryPath = options.queryPath.trim();
	let filePath = options.filePath.trim();
	// the .n8n directory (when not in a dev environment)
	filePath ||= `${__dirname}/../../../../../../../JsonDatabase.Global.json`;
	const directory = filePath.split('/').slice(0, -1).join('/');
	const lockPath = (existsSync(filePath) || (!existsSync(filePath) && options.operation === 'opWrite')
		? `${directory}/~${filePath.split('/').slice(-1)[0]}.lock`
		: false
	);
	function updateLockTime() {
		writeFileSync(`${lockPath}/time`, Date.now().toString());
	}
	let database: IJsonObject = {};
	let lockTimeUpdater;
	if (lockPath) {
		while (true) {
			try {
				// we acquire the file lock
				mkdirSync(lockPath, { recursive: true });
				updateLockTime();
				lockTimeUpdater = setInterval(updateLockTime, lockTime/4);
				break;
			} catch (err) {
				console.log(err);
				// the lock is already acquired by another process
				if (err.code === 'EEXIST') {
					let lockWait = 0;
					let knowLockFile = false;
					while (lockWait <= lockTime) {
						try {
							if ((Date.now() - lockTime) >= Number(readFileSync(`${lockPath}/time`, 'utf8'))) {
								// the lock file is stale, let's hopefully steal it
								lockWait = -1;
								rmSync(lockPath, { recursive: true });
								break;
							} else {
								// let's wait for the lock to disappear/stale
								await sleep(lockTime/500);
								lockWait += lockTime/500;
							}
						} catch (err) {
							if (err.code === 'ENOENT') {
								if (existsSync(lockPath) && !knowLockFile) {
									// the lock is just being taken/released, let's wait a bit
									knowLockFile = true;
									await sleep(lockTime/250);
									lockWait += lockTime/250;
								} else {
									// the lock file just disappeared or it's invalid, let's hopefully make ours
									lockWait = -1;
									break;
								}
							} else {
								throw err;
							}
						}
					}
					if (lockWait !== -1) {
						const errMsg = 'The database is being kept locked for too much time. Try again later.';
						throw new NodeOperationError(execFunctions.getNode(), errMsg, { itemIndex });
						return { error: errMsg };
					}
				} else {
					throw err;
				}
			}
		}
	}
	if (existsSync(filePath)) {
		database = JSON.parse(readFileSync(filePath, 'utf8'));
	}
	let databaseBranch: IJsonObject = (queryPath ? _.get(database, queryPath) : database);
	if (options.operation === 'opWrite') {
		databaseBranch = options.sourceData;
		if ((['string', 'number', 'boolean'].includes(typeof(databaseBranch)) || databaseBranch === null) && !queryPath) {
			const errMsg = 'Single item values cannot be assigned to the JSON root.';
			throw new NodeOperationError(execFunctions.getNode(), errMsg, { itemIndex });
			return { error: errMsg };
		}
		queryPath ? _.set(database, queryPath, databaseBranch) : database = databaseBranch;
		if (!existsSync(directory)) {
			mkdirSync(directory, { recursive: true });
		}
		writeFileSync(filePath, JSON.stringify(database, null, '\t'));
	}
	if (lockPath) {
		clearTimeout(lockTimeUpdater);
		rmSync(lockPath, { recursive: true });
	}
	return { data: databaseBranch };
}

export class JsonDatabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JSON Database',
		name: 'JsonDatabase',
		icon: 'file:jsondatabase.svg',
		group: ['transform'],
		version: 1.0,
		description: 'Reads/writes data from/to a JSON file acting as an hierarchical key-value database',
		defaults: {
			name: 'JsonDatabase',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Read From Database',
						value: 'opRead',
						description: 'Reads data from a JSON database',
						action: 'Read data from a JSON database',
					},
					{
						name: 'Write To Database',
						value: 'opWrite',
						description: 'Writes data to a JSON database',
						action: 'Write data to a JSON database',
					},
				],
				default: 'opRead',
			},
			{
				displayName: 'Query Path',
				name: 'queryPath',
				type: 'string',
				default: '',
				placeholder: 'monsters["cookie-monster"].scares',
				description: 'Path on which to act on in the JSON tree (leave empty to select root)',
			},
			{
				displayName: 'Data Source',
				name: 'sourceType',
				type: 'options',
				noDataExpression: true,
				description: 'The source of the data to write in the chosen database path',
				options: [
					{
						name: 'Object Key',
						value: 'sourceTypeObject',
						description: 'Sets the data source for writing to a specified object key',
						action: 'Set the data source for writing to a specified object key',
					},
					{
						name: 'JSON String',
						value: 'sourceTypeJson',
						description: 'Sets the data source for writing to an arbitrary JSON string',
						action: 'Set the data source for writing to an arbitrary JSON string',
					},
				],
				default: 'sourceTypeObject',
				displayOptions: {
					show: {
						'operation': ['opWrite'],
					},
				},
			},
			{
				displayName: 'Source Object Key',
				name: 'sourceData',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'data',
				description: 'An object key from the current input context (as set by immediately preceding nodes) to use as data',
				displayOptions: {
					show: {
						'operation': ['opWrite'],
						'sourceType': ['sourceTypeObject'],
					},
				},
			},
			{
				displayName: 'Source JSON String',
				name: 'sourceData',
				type: 'string',
				default: '',
				placeholder: '[ "children", "grandma" ]',
				description: 'A JSON string to be evaluated as an object (empty field is equal to undefined, which means to delete from database)',
				displayOptions: {
					show: {
						'operation': ['opWrite'],
						'sourceType': ['sourceTypeJson'],
					},
				},
			},
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				placeholder: '/data/example-database.json',
				description: 'Path to the JSON file in which to read/write the data (leave empty to use the default global database)',
			},
		],
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let inputItems = this.getInputData();
		let sourceData;
		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const queryPath = this.getNodeParameter('queryPath', itemIndex) as string;
				const filePath = this.getNodeParameter('filePath', itemIndex) as string;
				if (operation === 'opWrite') {
					const sourceType = this.getNodeParameter('sourceType', itemIndex) as string;
					sourceData = this.getNodeParameter('sourceData', itemIndex) as string;
					switch (sourceType) {
						case 'sourceTypeObject':
							sourceData = _.get(inputItems[itemIndex].json, sourceData);
							break;
						case 'sourceTypeJson':
							sourceData = (sourceData.trim() ? JSON.parse(sourceData.trim()) : undefined);
							break;
					}
				}
				const jsonResult = await handleJsonOperation(this, itemIndex, { operation, queryPath, sourceData, filePath });
				returnItems.push({
					json: { ...jsonResult },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnItems);
	}	
}
