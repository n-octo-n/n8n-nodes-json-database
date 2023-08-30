import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
//	NodeOperationError,
} from 'n8n-workflow';

import {
	existsSync,
	readFileSync,
	writeFileSync,
	mkdirSync,
} from 'fs';

const _ = require('../../lib/lodash.custom.min.js');

export interface IJsonObject {[key: string]: any};

//async function selectJsonBranch(object: IJsonObject, query: string): Promise<IJsonObject> {
//	let pathTree = [];
//	let wordBuffer = '';
//	let inLiteral = { wrap: false, quote: false };
	// Note: it's always implied that if we are in a quote then we must be in a wrap (or the opposite)
	/*for (char of query) {
		if (!inLiteral.wrap)
		{
			if ('.['.includes(char))
			{
				pathTree = [...pathTree, wordBuffer];
				wordBuffer = '';
				
			}
			else
			{
				wordBuffer += char;
			}
		}
		else
		if (inLiteral.wrap && !inLiteral.quote)
		{
			
		}
		else
		if (inLiteral.quote)
		{
			
		}
/*		if (!inLiteral.quote && query[c] === '.')
		{
			
		}
		else
		if (!inLiteral.quote && !inLiteral.wrap && query[c] === '[')
		{
			inLiteral.wrap = true;
		}
		else
		if (!inLiteral.quote && inLiteral.wrap &&  query[c] === '[')
		{

		}
		else
		if (inLiteral.quote && inLiteral.wrap && query[c] === '[')
		{
			inLiteral.wrap = true;
		}
		else
		if (!inLiteral.quote && inLiteral.wrap && query[c] === ']')
		{
			inLiteral.wrap = false;
		}
		else
		{
			wordBuffer += query[c];
		}
*/
//	}
//	
//	return branch;
//}

async function handleJsonOperation(options: IJsonObject): Promise<IJsonObject> {
	let queryPath = options.queryPath.trim();
	let filePath = options.filePath.trim();
	// the .n8n directory (when not in a dev environment)
	filePath ||= `${__dirname}/../../../../../../../JsonDatabase.Global.json`;
	// handle default database in another dir if .n8n/... is not writable
	//...
	let database: IJsonObject = {};
	if (existsSync(filePath)) {
		// try to open database and lock it
		database = JSON.parse(readFileSync(filePath, 'utf8'));
		//...
	}
	let databaseBranch: IJsonObject = (queryPath ? _.get(database, queryPath) : database);
	if (options.operation === 'opWrite') {
		databaseBranch = options.sourceData;
		queryPath ? _.set(database, queryPath, databaseBranch) : database = {};
		const directory = filePath.split('/').slice(0, -1).join('/');
		if (!existsSync(directory)) {
			mkdirSync(directory);
		}
		writeFileSync(filePath, JSON.stringify(database, null, '\t'));
	}
	// release lock
	//...
	return databaseBranch;
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
						name: 'Read from database',
						value: 'opRead',
						description: 'Reads data from a JSON database',
						action: 'Read data from a JSON database',
					},
					{
						name: 'Write to database',
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
/*
					{
						name: 'Object Key',
						value: 'sourceTypeObject',
						description: 'Sets the data source for writing to a specified object key',
						action: 'Set the data source for writing to a specified object key',
					},
*/
					{
						name: 'JSON String',
						value: 'sourceTypeJson',
						description: 'Sets the data source for writing to an arbitrary JSON string',
						action: 'Set the data source for writing to an arbitrary JSON string',
					},
				],
				default: 'sourceTypeJson', // 'sourceTypeObject',
				displayOptions: {
					show: {
						'operation': ['opWrite'],
					},
				},
			},
/*
			{
				displayName: 'Source Object Key',
				name: 'sourceObject',
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
*/
			{
				displayName: 'Source JSON String',
				name: 'sourceJson',
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
		let operation: string, queryPath: string, sourceType: string, sourceObject: string, sourceJson: string, filePath: string;
		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			try {
				operation = this.getNodeParameter('operation', itemIndex) as string;
				queryPath = this.getNodeParameter('queryPath', itemIndex) as string;
				filePath = this.getNodeParameter('filePath', itemIndex) as string;
				let sourceData: IJsonObject = {};
				if (operation === 'opWrite') {
					sourceType = this.getNodeParameter('sourceType', itemIndex) as string;
					switch (sourceType) {
						case 'sourceTypeObject':
							sourceObject = this.getNodeParameter('sourceObject', itemIndex) as string;
							// sourceData = ...
							sourceObject;
							break;
						case 'sourceTypeJson':
							sourceJson = this.getNodeParameter('sourceJson', itemIndex) as string;
							sourceData = (sourceJson.trim() ? JSON.parse(sourceJson.trim()) : undefined);
							break;
					}
				}
				const jsonResult = await handleJsonOperation({ operation, queryPath, sourceData, filePath });
				//if (error !== undefined) {
				//	throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
				//}
				returnItems.push({
					json: { data: jsonResult },
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
