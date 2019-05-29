
const Fasttoken = artifacts.require("Fasttoken");


contract('Fasttoken', async (accounts) => {

        /// Basic properties
        const TOKEN_NAME = "Fasttoken";
        const TOKEN_SYMBOL = "FTN";
        const TOKEN_DECIMALS = 18;
        const TOTAL_SUPPLY = 564000000 * (10 ** TOKEN_DECIMALS);

        /// Token
        let FTN;

        before(async() => {
                 FTN = await Fasttoken.new(accounts[0],{from:accounts[0]});
        });

        describe("Token Basic Properties", async function () {

                it("Name - " + TOKEN_NAME, async function () {
                        let t = await FTN.name.call({from:accounts[0]});
                        assert.equal(t, TOKEN_NAME);
                });

                it("Symbol - " + TOKEN_SYMBOL, async function () {
                        let t = await FTN.symbol.call({from:accounts[0]});
                        assert.equal(t, TOKEN_SYMBOL);
                });

                it("Decimals - " + TOKEN_DECIMALS, async function () {
                        let t = await FTN.decimals.call({from:accounts[0]});
                        assert.equal(t, TOKEN_DECIMALS);
                });

                it("Total Supply - " + TOTAL_SUPPLY, async function () {
                        let t = await FTN.totalSupply.call({from:accounts[0]});
                        assert.equal(t, TOTAL_SUPPLY);
                });
        });


        describe("Token Transfer Functions", async function () {

                it("should transfer from owner to another address", async function () {
                        await FTN.transfer(accounts[1], 1000, { from:accounts[0] });
                        let account1Balance = await FTN.balanceOf.call(accounts[1], { from:accounts[0] });
                        assert.equal(account1Balance,1000);
                });

                it('should FAIL to transfer to null address', async() => {
                        try {
                                await FTN.transfer(0, 1000, { from:accounts[0] });
                        } catch (error) {
                                return true;
                        }
                        throw new Error("I should never see this!")
                });

                it('should FAIL to transfer more tokens than available', async() => {
                        try {
                                await FTN.transfer(accounts[1], TOTAL_SUPPLY + 1, { from:accounts[0] });
                        } catch (error) {
                                return true;
                        }
                        throw new Error("I should never see this!")
                });
        });

        describe("Token TransferFrom / Allowance Functions", async function () {

                it('should give an allowance of 9999 to another account', async() => {
                        await FTN.approve(accounts[3], 9999, { from:accounts[0] });
                        let allowance = await FTN.allowance.call(accounts[0], accounts[3], { from:accounts[0] });
                        assert.equal(allowance.toString(10), 9999);
                });

                it('should transferFrom from allowance', async() => {
                        await FTN.transferFrom(accounts[0], accounts[4], 3333, { from:accounts[3] });
                        let updatedAllowance = await FTN.allowance.call(accounts[0], accounts[3], { from:accounts[0] });
                        assert.equal(updatedAllowance.toString(10), 6666);

                        let account4Balance = await FTN.balanceOf.call(accounts[4], { from:accounts[0] });
                        assert.equal(account4Balance.toString(10), 3333);
                });

                it('should increase allowance', async() => {
                        await FTN.increaseAllowance(accounts[5], 100, { from:accounts[0] });
                        let updatedAllowance = await FTN.allowance.call(accounts[0], accounts[5], { from:accounts[0] });
                        assert.equal(updatedAllowance.toString(10), 100);
                });

                it('should decrease allowance', async() => {
                        let allowanceToDecrease = 50;
                        let origAllowance = await FTN.allowance.call(accounts[0], accounts[5], { from:accounts[0] });
                        await FTN.decreaseAllowance(accounts[5], allowanceToDecrease, { from:accounts[0] });
                        let updatedAllowance = await FTN.allowance.call(accounts[0], accounts[5], { from:accounts[0] });
                        assert.equal(parseInt(origAllowance), parseInt(updatedAllowance) + allowanceToDecrease);
                });

                it('should completely decrease allowance', async() => {
                        let allowanceToDecrease = 0;
                        let origAllowance = await FTN.allowance.call(accounts[0], accounts[5], { from:accounts[0] });
                        await FTN.approve(accounts[5], allowanceToDecrease, { from:accounts[0] });
                        let updatedAllowance = await FTN.allowance.call(accounts[0], accounts[5], { from:accounts[0] });
                        assert.equal(updatedAllowance.toString(10), 0);
                });

                it('should FAIL to transferFrom to null address', async() => {
                        try {
                                await FTN.transferFrom(accounts[0], 0, 1, { from:accounts[3] });
                        } catch (error) {
                                return true;
                        }
                        throw new Error("I should never see this!")
                });

                it('should FAIL to transferFrom if _from has not enough balance', async() => {
                        try {
                                await FTN.transferFrom(accounts[0], accounts[5], TOTAL_SUPPLY + 1, { from:accounts[3] });
                        } catch (error) {
                                return true;
                        }
                        throw new Error("I should never see this!")
                });

                it('should FAIL to transferFrom more than the allowance granted', async() => {
                        try {
                                await FTN.transferFrom(accounts[0], accounts[5], 50000, { from:accounts[3] });
                        } catch (error) {
                                return true;
                        }
                        throw new Error("I should never see this!")
                });
        });
});
