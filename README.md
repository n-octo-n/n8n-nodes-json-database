# n8n-nodes-json-database

This is an n8n node lets you easily and efficiently use JSON files as persistent, hierarchical key-value databases/stores.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Compatibility](#compatibility)  
[Usage](#usage)  
<!--[Quirks](#quirks)  -->
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The npm name for this package is `@n-octo-n/n8n-nodes-json-database`.

## Compatibility

Tested on n8n `1.4.0` as of 2023/08/31.

## Usage

Operations:

* Read From Database
* Write To Database

Common Parameters:

* **Query Path** (optional): The path on which to act on in the JSON tree. Supports the standard JavaScript dot-and-bracket property access notation. Leaving the field empty will make the node act on the root of the JSON tree.
* **File Path** (optional): The system path to the JSON file in which to read/write the data. Leaving the field empty, if everything goes well, will make the node use the default global database (which should be located in `~/.n8n/JsonDatabase.Global.json`).

Write-specific parameters:

* **Data Source** (required): only one of the following options: 
	* **Source Object Key** (required): An object key from the current input context (as set by immediately preceding nodes) to read data from. For example, the name of a property specified via a Set node, placed immediately before the JSON Database node.
	* **Source JSON String** (optional): Any JSON string that can be parsed and evaluated as an object in JavaScript. Leaving the field empty will interally force the value to be considered `undefined`, and will thus simply delete the destination branch in the JSON tree.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [JSON Documentation](https://www.json.org/)
* [JSON in JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
* [Accessing properties of Objects in JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects#accessing_properties)

