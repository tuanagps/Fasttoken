
module.exports = {
        // See <http://truffleframework.com/docs/advanced/configuration>
        // to customize your Truffle configuration!
        networks: {
                development: {
                        host: "",
                        port: 8549,
                        from: '0xEd79b1F69fB60a0FA2262ccd3F7D5FEb659016b7',
                        gas: "6000000",
                        gasPrice: "100000000000",
                        network_id: "*" // Match any network id
                },
                localDev: {
                        host: "127.0.0.1",
                        port: 8545,
                        from: '0xEd79b1F69fB60a0FA2262ccd3F7D5FEb659016b7',
                        gas: "6000000",
                        gasPrice: "100000000000",
                        network_id: "*" // Match any network id
                },
                ropsten: {
                        host: "",
                        port: 8545,
                        from: "0xEd79b1F69fB60a0FA2262ccd3F7D5FEb659016b7",
                        network_id: 3
                },
                rinkeby: {
                        host: "",
                        port: 8547,
                        from: "0xEd79b1F69fB60a0FA2262ccd3F7D5FEb659016b7",
                        gas: "6500000",
                        gasPrice: "30000000000",
                        network_id: 4
                },
                main: {
                        //host: "",
                        //port:,
                        network_id: 1
                }
        },
        solc: {
                optimizer: {
                        enabled: true,
                        runs: 200
                }
        },
        mocha: {
                enableTimeouts: false
       }
};
