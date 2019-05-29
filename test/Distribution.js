
const Distribution = artifacts.require("Distribution");
const Fasttoken = artifacts.require("Fasttoken");

const Web3 = require('web3')

var BigNumber = require('bignumber.js')


//The following line is required to use timeTravel with web3 v1.x.x
Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;

const w3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545")) // Hardcoded development port


const timeTravel = function (time) {
        return new Promise ((resolve, reject) => {
                w3.currentProvider.sendAsync({
                        jsonrpc: "2.0",
                        method: "evm_increaseTime",
                        params: [time], // 86400 is num seconds in day
                        id: new Date().getTime()
                }, (err, result) => {
                        if (err) {
                                return reject(err);
                        }
                        return resolve(result)
                });
        })
}

const mineBlock = function () {
        return new Promise ((resolve, reject) => {
                w3.currentProvider.sendAsync({
                        jsonrpc: "2.0",
                        method: "evm_mine"
                }, (err, result) => {
                        if (err) {
                                return reject(err);
                        }
                        return resolve(result);
                });
        });
}



contract('Distribution', async (accounts) => {

        let totalSupply;
        let distribution;
        let fasttoken;

        let timeOffset = 3600; // Starts in a hour
        let startTime = 0;


        // Accounts
        let accountOwner = accounts[0];
        let accountFounder1 = accounts[1];
        let accountFounder2 = accounts[2];
        let accountTeam = accounts[3];
        let accountPartners1 = accounts[4];
        let accountPartners2 = accounts[5];
        let accountInvestor = accounts[6];
        let accountPlayer = accounts[7];
        let accountBankroll = accounts[8];
        let accountMarketing = accounts[9];


        // Allocation structure
        let allocationStruct = {

                allocationType: 0,      // Type of allocation
                endCliff: 0,            // Tokens are locked until
                endVesting: 0,          // This is when the tokens are fully unvested
                totalAllocated: 0,      // Total tokens allocated
                amountClaimed: 0        // Total tokens claimed
        }

        function setAllocationStruct(s){

                allocationStruct.allocationType = s[0].toNumber();
                allocationStruct.endCliff = s[1].toNumber();
                allocationStruct.endVesting = s[2].toNumber();
                allocationStruct.totalAllocated = s[3].toNumber();
                allocationStruct.amountClaimed = s[4].toNumber();
        }

        function logWithdrawalData(allocationType, currentBlockTime, account_presale, contractStartTime, allocation, new_presale_tokenBalance){

                console.log("\n");
                console.log("Review tokens withdrawn for "+ allocationType +" account:\n" + account_presale);
                console.log("Current time:", currentBlockTime.toString(10));
                console.log("Start time:", contractStartTime.toString(10));
                console.log("Cliff End:", allocation[1].toString(10));
                console.log("Vesting End:", allocation[2].toString(10));
                console.log("Tokens Allocated:", allocation[3].toString(10));
                console.log("Tokens Claimed :", allocation[4].toString(10));
                console.log("fasttoken balance :", new_presale_tokenBalance.toString(10));
                console.log("\n");
        }

        function calculateExpectedTokens(allocation, currentTime, contractStartTime){

                if (currentTime >= allocation[2].toNumber()) {
                        return allocation[3].toNumber();
                } else {
                        return Math.floor((allocation[3].toNumber() * (currentTime - contractStartTime.toNumber())) / (allocation[2].toNumber() - contractStartTime.toNumber()));
                }
        }

        // General allocation test
        async function doAllocationTests(allocationType, tokenAllocation, account) {

                it("should allocate " + allocationType + " " + tokenAllocation.toString() + " tokens", async function () {

                        let oldSupply;
                        let allocationTypeNum;

                        switch (allocationType) {
                                case "FOUNDER":
                                        oldSupply = await distribution.availableFounderSupply.call();
                                        allocationTypeNum = 0;
                                        break;
                                case "TEAM":
                                        oldSupply = await distribution.availableTeamSupply.call();
                                        allocationTypeNum = 1;
                                        break;
                                case "PARTNER":
                                        oldSupply = await distribution.availablePartnersDistributionSupply.call();
                                        allocationTypeNum = 2;
                                        break;
                                case "PLAYER":
                                        oldSupply = await distribution.availablePlayersDistributionSupply.call();
                                        allocationTypeNum = 3;
                                        break;
                                case "BANKROLL":
                                        oldSupply = await distribution.availableBankrollSupply.call();
                                        allocationTypeNum = 4;
                                        break;
                                case "SELL":
                                        oldSupply = await distribution.availableSellSupply.call();
                                        allocationTypeNum = 5;
                                        break;
                                case "MARKETING":
                                        oldSupply = await distribution.availableMarketingSupply.call();
                                        allocationTypeNum = 6;
                                        break;
                                default:
                        }


                        await distribution.setAllocation(account, tokenAllocation, allocationTypeNum, { from:accountOwner });
                        let allocation = await distribution.allocations.call(account);
                        setAllocationStruct(allocation);

                        // Allocation must be equal to the passed tokenAllocation
                        assert.equal(allocationStruct.totalAllocated, tokenAllocation);
                        assert.equal(allocationStruct.allocationType, allocationTypeNum);

                        let newPresaleSupply = 0;

                        switch (allocationType) {
                                case "FOUNDER":
                                        newPresaleSupply = await distribution.availableFounderSupply.call();
                                        break;
                                case "TEAM":
                                        newPresaleSupply = await distribution.availableTeamSupply.call();
                                        break;
                                case "PARTNER":
                                        newPresaleSupply = await distribution.availablePartnersDistributionSupply.call();
                                        break;
                                case "PLAYER":
                                        newPresaleSupply = await distribution.availablePlayersDistributionSupply.call();
                                        break;
                                case "BANKROLL":
                                        newPresaleSupply = await distribution.availableBankrollSupply.call();
                                        break;
                                case "SELL":
                                        newPresaleSupply = await distribution.availableSellSupply.call();
                                        break;
                                case "MARKETING":
                                        newPresaleSupply = await distribution.availableMarketingSupply.call();
                                        break;
                                default:

                        }

                        // Supply must match the new supply available
                        assert.equal(BigNumber(oldSupply).toString(), BigNumber(newPresaleSupply).plus(tokenAllocation).toString());
                });
        };

        before (async() => {
                await w3.eth.sendTransaction({ from: accounts[0], to: accounts[0], value: 0 });
                let now = (await w3.eth.getBlock("latest")).timestamp;
                startTime = now + timeOffset;

                distribution = await Distribution.new(startTime, { from:accounts[0] });
                let fa = await distribution.ftn({ from:accounts[0] });
                fasttoken = await Fasttoken.at(fa);
                contractStartTime = await distribution.startTime({ from:accounts[0] });
                totalSupply = await distribution.INITIAL_SUPPLY({ from:accounts[0] });
        });

        describe ("All tests", async function () {

                // Test Distribution
                describe ("Distribution percentage", async function () {

                        const founderPercentage = 30;
                        const teamPercentabe = 3;
                        const partnersPercentabe = 5;
                        const playersPercentabe = 25;
                        const bankrollPercentabe = 20;
                        const sellPercentabe = 15;
                        const marketingPercentabe = 2;

                        it("Founder should have - " + founderPercentage.toString() + "%", async function () {

                                let founderAvailableSupply = BigNumber(await distribution.availableFounderSupply.call());
                                assert.equal(founderPercentage, founderAvailableSupply.multipliedBy(100).dividedBy(totalSupply).toNumber());
                        });

                        it("Team should have - " + teamPercentabe.toString() + "%", async function () {

                                let founderAvailableSupply = BigNumber(await distribution.availableTeamSupply.call());
                                assert.equal(teamPercentabe, founderAvailableSupply.multipliedBy(100).dividedBy(totalSupply).toNumber());
                        });

                        it("PartnersDistribution should be - " + partnersPercentabe.toString() + "%", async function () {

                                let founderAvailableSupply = BigNumber(await distribution.availablePartnersDistributionSupply.call());
                                assert.equal(partnersPercentabe, founderAvailableSupply.multipliedBy(100).dividedBy(totalSupply).toNumber());
                        });

                        it("PlayersDistribution should be - " + playersPercentabe.toString() + "%", async function () {

                                let founderAvailableSupply = BigNumber(await distribution.availablePlayersDistributionSupply.call());
                                assert.equal(playersPercentabe, founderAvailableSupply.multipliedBy(100).dividedBy(totalSupply).toNumber());
                        });

                        it("Backroll should be - " + bankrollPercentabe.toString() + "%", async function () {

                                let founderAvailableSupply = BigNumber(await distribution.availableBankrollSupply.call());
                                assert.equal(bankrollPercentabe, founderAvailableSupply.multipliedBy(100).dividedBy(totalSupply).toNumber());
                        });

                        it("Sell should be - " + sellPercentabe.toString() + "%", async function () {

                                let founderAvailableSupply = BigNumber(await distribution.availableSellSupply.call());
                                assert.equal(sellPercentabe, founderAvailableSupply.multipliedBy(100).dividedBy(totalSupply).toNumber());
                        });

                        it("Marketing should be - " + marketingPercentabe.toString() + "%", async function () {

                                let founderAvailableSupply = BigNumber(await distribution.availableMarketingSupply.call());
                                assert.equal(marketingPercentabe, founderAvailableSupply.multipliedBy(100).dividedBy(totalSupply).toNumber());
                        });

                });


                // Test Allocations
                describe ("Allocations", async function () {

                        let oldTotalSupply;
                        let grantTotalAllocationSum = new BigNumber(0);
                        let tokensAllocated;

                        before (async() => {
                                oldTotalSupply = BigNumber(await distribution.availableTotalSupply.call());
                        });

                        describe ("FOUNDER 1 Allocation", async function () {

                                let tokensToAllocate = 145000;
                                doAllocationTests("FOUNDER", tokensToAllocate, accountFounder1);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("FOUNDER 2 Allocation", async function () {

                                let tokensToAllocate = 50000;
                                doAllocationTests("FOUNDER", tokensToAllocate, accountFounder2);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("TEAM Allocation", async function () {

                                let tokensToAllocate = 120000;
                                doAllocationTests("TEAM", tokensToAllocate, accountTeam);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("PARTNER 1 Allocation", async function () {

                                let tokensToAllocate = 150000;
                                doAllocationTests("PARTNER", tokensToAllocate, accountPartners1);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("PARTNER 2 Allocation", async function () {

                                let tokensToAllocate = 210000;
                                doAllocationTests("PARTNER", tokensToAllocate, accountPartners2);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("PLAYER Allocation", async function () {

                                let tokensToAllocate = 2000;
                                doAllocationTests("PLAYER", tokensToAllocate, accountPlayer);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("BANKROLL Allocation", async function () {

                                let tokensToAllocate = 4000;
                                doAllocationTests("BANKROLL", tokensToAllocate, accountBankroll);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("SELL Allocation", async function () {

                                let tokensToAllocate = 8000;
                                doAllocationTests("SELL", tokensToAllocate, accountInvestor);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("MARKETING Allocation", async function () {

                                let tokensToAllocate = 500;
                                doAllocationTests("MARKETING", tokensToAllocate, accountMarketing);

                                after(async() => {
                                        oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
                                        grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
                                });
                        });

                        describe ("Allocation post tests", async function () {

                                it("New total supply should match allocations previously made", async function () {
                                        let newTotalSupply = await distribution.availableTotalSupply.call();
                                        assert.equal(oldTotalSupply.toString(10), newTotalSupply.toString(10));
                                });

                                it("Grand total should match allocations previously made", async function () {
                                        let grandTotalAllocated = await distribution.grandTotalAllocated.call();
                                        assert.equal(grantTotalAllocationSum.toString(10),grandTotalAllocated.toString(10));
                                });
                        }); 

                        describe ("Allocation invalid parameters", async function () {

                                it ("should reject invalid supply codes", async function () {
                                        try {
                                                await distribution.setAllocation(accountFounder1, 1000, 7, { from:accountOwner });
                                        } catch (error) {
                                                //console.log("✅   Rejected invalid supply code");
                                                return true;
                                        }
                                        throw new Error("I should never see this!");
                                });

                                it ("should reject invalid address", async function () {
                                        try {
                                                await distribution.setAllocation(0, 1000, 0, { from:accountOwner });
                                        } catch (error) {
                                                //console.log("✅   Rejected invalid address");
                                                return true;
                                        }
                                        throw new Error("I should never see this!")
                                });

                                it ("should reject invalid allocation", async function () {
                                        try {
                                                await distribution.setAllocation(accountFounder2, 0, 0, { from:accountOwner });
                                        } catch (error) {
                                                //console.log("✅   Rejected invalid allocation");
                                                return true;
                                        }
                                        throw new Error("I should never see this!")
                                });

                                it ("should reject repeated allocations", async function () {
                                        try {
                                                await distribution.setAllocation(accountFounder1, 1000, 0, { from:accountOwner });
                                        } catch (error) {
                                                //console.log("✅   Rejected repeated allocations ");
                                                return true;
                                        }
                                        throw new Error("I should never see this!");
                                });

                                it ("should reject allocations by other account", async function () {
                                        try {
                                                await distribution.setAllocation(accountOwner, 1000, 5, { from:accountFounder1 });
                                        } catch (error) {
                                                //console.log("✅   Rejected repeated allocations ");
                                                return true;
                                        }
                                        throw new Error("I should never see this!");
                                });
                        });
                });

                // Test withdrawal
                describe("Withdrawal / Transfer", async function () {

                        describe("Withdraw immediately after allocations", async function () {
                                it("should reject withdraw tokens before token distribution time", async function () {
                                        try {
                                                await distribution.transferTokens(accountPlayer, { from:accountOwner });
                                        } catch (error) {
                                                //console.log("✅   Rejected before token distribution");
                                                return true;
                                        }
                                        throw new Error("I should never see this!");
                                });
                        });

                        describe("Withdraw allocations between token distribution time and cliff period", async function () {

                                before(async() => {
                                        // Time travel to startTime;
                                        await timeTravel(timeOffset + 1) // Move forward in time so the distribution has started
                                        await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
                                });

                                it("should withdraw INVERSTOR tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountInvestor);
                                        await distribution.transferTokens(accountInvestor, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountInvestor);

                                        // REWARD tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountInvestor);

                                        logWithdrawalData("INVESTOR", currentBlock.timestamp, accountInvestor, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10), newTokenBalance.toString(10));
                                });

                                it("should withdraw BANKROLL tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountBankroll);
                                        await distribution.transferTokens(accountBankroll, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountBankroll);

                                        // BANKROLL tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountBankroll);

                                        logWithdrawalData("BANKROLL", currentBlock.timestamp, accountBankroll, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10), newTokenBalance.toString(10));
                                });

                                it("should withdraw MARKETING tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountMarketing);
                                        await distribution.transferTokens(accountMarketing, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountMarketing);

                                        // MARKETING tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountMarketing);

                                        logWithdrawalData("MARKETING", currentBlock.timestamp, accountMarketing, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10), newTokenBalance.toString(10));
                                });


                                it("should fail to withdraw FOUNDER 1 tokens as cliff period not reached", async function () {
                                        try {
                                                await distribution.transferTokens(accountFounder1, { from:accountOwner });
                                        } catch (error) {
                                                let currentBlock = await w3.eth.getBlock("latest");

                                                let newTokenBalance = await fasttoken.balanceOf.call(accountFounder1);
                                                let allocation = await distribution.allocations.call(accountFounder1);
                                                logWithdrawalData("FOUNDER 1", currentBlock.timestamp, accountFounder1, contractStartTime, allocation, newTokenBalance);

                                                return true;
                                        }
                                        throw new Error("I should never see this!")
                                });

                                it("should fail to withdraw TEAM tokens as cliff period not reached", async function () {
                                        try {
                                                await distribution.transferTokens(accountTeam, { from:accountOwner });
                                        } catch (error) {
                                                let currentBlock = await w3.eth.getBlock("latest");

                                                let newTokenBalance = await fasttoken.balanceOf.call(accountTeam);
                                                let allocation = await distribution.allocations.call(accountTeam);
                                                logWithdrawalData("TEAM", currentBlock.timestamp, accountTeam, contractStartTime, allocation, newTokenBalance);

                                                return true;
                                        }
                                        throw new Error("I should never see this!")
                                });

                                it("should fail to withdraw PARTNER 1 tokens as cliff period not reached", async function () {
                                        try {
                                                await distribution.transferTokens(accountPartners1, { from:accountOwner });
                                        } catch (error) {
                                                let currentBlock = await w3.eth.getBlock("latest");

                                                let newTokenBalance = await fasttoken.balanceOf.call(accountPartners1);
                                                let allocation = await distribution.allocations.call(accountPartners1);
                                                logWithdrawalData("PARTNER 1", currentBlock.timestamp, accountPartners1, contractStartTime, allocation, newTokenBalance);

                                                return true;
                                        }
                                        throw new Error("I should never see this!")
                                });

                                it("should fail to withdraw PlayersDistribution tokens as cliff period not reached", async function () {
                                        try {
                                                await distribution.transferTokens(accountPlayer, { from:accountOwner });
                                        } catch (error) {
                                                let currentBlock = await w3.eth.getBlock("latest");

                                                let newTokenBalance = await fasttoken.balanceOf.call(accountPlayer);
                                                let allocation = await distribution.allocations.call(accountPlayer);
                                                logWithdrawalData("PARTNER 1", currentBlock.timestamp, accountPlayer, contractStartTime, allocation, newTokenBalance);

                                                return true;
                                        }
                                        throw new Error("I should never see this!")
                                });

                        });


                        describe("Withdraw 1.5 year after allocations", async function () {

                                before(async() => {
                                        //Time travel to startTime + 1.5 year;
                                        await timeTravel((3600 * 24 * 365 * 1.5)) // Move forward in time so the crowdsale has started
                                        await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
                                });

                                it("should withdraw FOUNDER 1 tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountFounder1);
                                        await distribution.transferTokens(accountFounder1, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountFounder1);

                                        //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountFounder1);

                                        logWithdrawalData("FOUNDER 1", currentBlock.timestamp, accountFounder1, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10),newTokenBalance.toString(10));
                                });

                                it("should withdraw TEAM tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountTeam);
                                        await distribution.transferTokens(accountTeam, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountTeam);

                                        //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountTeam);

                                        logWithdrawalData("TEAM", currentBlock.timestamp, accountTeam, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10),newTokenBalance.toString(10));
                                });

                                it("should withdraw PARTNER 1 tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountPartners1);
                                        await distribution.transferTokens(accountPartners1, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountPartners1);

                                        //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountPartners1);

                                        logWithdrawalData("PARTNER 1", currentBlock.timestamp, accountPartners1, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10),newTokenBalance.toString(10));
                                });


                                it("should withdraw PLAYER tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountPlayer);
                                        await distribution.transferTokens(accountPlayer, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountPlayer);

                                        // PLAYER tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountPlayer);

                                        logWithdrawalData("PLAYER", currentBlock.timestamp, accountPlayer, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10), newTokenBalance.toString(10));
                                });

                        });

                        describe("Withdraw 2 years after allocations", async function () {

                                before(async() => {
                                        //Time travel to startTime + 2 years;
                                        await timeTravel((3600 * 24 * 365 * 0.5)) // Move forward in time so the crowdsale has started
                                        await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
                                });

                                it("should withdraw FOUNDER 1 tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountFounder1);
                                        await distribution.transferTokens(accountFounder1, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountFounder1);

                                        //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountFounder1);

                                        logWithdrawalData("FOUNDER 1", currentBlock.timestamp, accountFounder1, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10),newTokenBalance.toString(10));
                                });

                                it("should withdraw TEAM tokens", async function () {
                                        let currentBlock = await w3.eth.getBlock("latest");

                                        // Check token balance for account before calling transferTokens, then check afterwards.
                                        let tokenBalance = await fasttoken.balanceOf.call(accountTeam);
                                        await distribution.transferTokens(accountTeam, { from:accountOwner });
                                        let newTokenBalance = await fasttoken.balanceOf.call(accountTeam);

                                        //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
                                        let allocation = await distribution.allocations.call(accountTeam);

                                        logWithdrawalData("TEAM", currentBlock.timestamp, accountTeam, contractStartTime, allocation, newTokenBalance);

                                        let expectedTokenBalance = calculateExpectedTokens(allocation, currentBlock.timestamp, contractStartTime);
                                        assert.equal(expectedTokenBalance.toString(10),newTokenBalance.toString(10));
                                });
                        });
                });
        });
});
