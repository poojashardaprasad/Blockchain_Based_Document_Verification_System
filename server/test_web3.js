
const Web3 = require('web3').default || require('web3');
console.log('Web3 Version:', Web3.version);

const web3 = new Web3('http://127.0.0.1:7545');
const addr = '0x300452648865560D6e87F250E88888CeCa6d2739C';

console.log('Address:', addr);
try {
    console.log('isAddress:', web3.utils.isAddress(addr));
} catch (e) {
    console.error('isAddress error:', e.message);
}

console.log('Address (Lower):', addr.toLowerCase());
try {
    console.log('isAddress (Lower):', web3.utils.isAddress(addr.toLowerCase()));
} catch (e) {
    console.error('isAddress error:', e.message);
}

try {
    console.log('toChecksumAddress (Lower):', web3.utils.toChecksumAddress(addr.toLowerCase()));
} catch (e) {
    console.error('toChecksumAddress error:', e.message);
}

try {
    const contract = new web3.eth.Contract([], addr);
    console.log('Contract created successfully');
} catch (e) {
    console.error('Contract creation error:', e.message);
}
