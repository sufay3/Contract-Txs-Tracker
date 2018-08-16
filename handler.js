var _ = require("underscore");
var writeToDB = require("./db.js");

var handler = function (web3, mongodb, data, subscription) {
    if (data) {
        web3.eth.getBlock(data.number)
            .then(block => {
                block.transactions.forEach(txHash => {
                    web3.eth.getTransaction(txHash)
                        .then(tx => {
                            if (tx.to !== null) {
                                web3.eth.getCode(tx.to)
                                    .then(code => {
                                        if (code.length > 2) {
                                            return web3.eth.getTransactionReceipt(txHash);
                                        } else {
                                            return Promise.reject(false);
                                        }
                                    })
                                    .then(receipt => {
                                        writeToDB(mongodb, "ethereum", "contract_txs", buildTransaction(tx, receipt));
                                    })
                                    .catch(err => {
                                        if (_.isObject(err)) {
                                            console.log(err.message);
                                        }
                                    });
                            }
                        })
                        .catch(err => {
                            console.log(err.message);
                        });
                });
            })
            .catch(err => {
                console.log(err.message);
            });
    }
};

function isTransactionSuccessful(receipt) {
    return receipt && (receipt.status === true || receipt.status === "0x1" || typeof receipt.status === "undefined");
}

function buildTransaction(tx, receipt) {
    if (_.isObject(tx) && _.isObject(receipt) && !_.isEmpty(tx) && !_.isEmpty(receipt)) {
        return {
            hash: tx.hash,
            status: isTransactionSuccessful(receipt),
            blockNumber: tx.blockNumber,
            blockHash: tx.blockHash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            nonce: tx.nonce,
            gas: tx.gas,
            gasUsed: receipt.gasUsed,
            gasPrice: tx.gasPrice,
            data: tx.input,
            logs: receipt.logs.map(log => { return logHandler(log) })
        };
    }

    return {};
}

function logHandler(log) {
    if (_.isObject(log)) {
        return {
            address: log.address,
            topics: log.topics
        };
    }

    return {};
}

module.exports = handler;
