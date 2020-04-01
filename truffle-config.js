
module.exports = {
        // See <http://truffleframework.com/docs/advanced/configuration>
        // to customize your Truffle configuration!
        networks: {
                development: {
                        host: "",
                        port: ,
                        from: '',
                        gas: "6000000",
                        gasPrice: "100000000000",
                        network_id: "*" // Match any network id
                },
                localDev: {
                        host: "",
                        port: ,
                        from: '',
                        gas: "6000000",
                        gasPrice: "100000000000",
                        network_id: "*" // Match any network id
                },
                ropsten: {
                        host: "",
                        port: ,
                        from: "",
                        network_id: 3
                },
                rinkeby: {
                        host: "",
                        port: ,
                        from: "",
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
        compilers: {
                solc: {
                        version: "0.5.2"
                }
        },
        mocha: {
                enableTimeouts: false
       }
};
