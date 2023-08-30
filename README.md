# n8n-nodes-json-database

This is an n8n node lets you easily and efficiently use JSON files as persistent, hierarchical key-value databases/stores.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Quirks](#quirks)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The npm name for this package is `@n-octo-n/n8n-nodes-json-database`.

## Compatibility

Tested on n8n `1.4.0` as of 2023/08/31.

## Usage

_Work-in-progress_

## Quirks

* Currently, there is no mechanism for locking files on writing, or otherwise preventing concurrent writes when using this node to in multiple places/workflows at the same time on the same JSON file. This will soon be fixed, but beware in the meantime.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [JSON Documentation](https://www.json.org/)
	* [JSON | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)

