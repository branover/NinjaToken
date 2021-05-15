const NinjaToken = artifacts.require("NinjaToken");
const NinjaOracle = artifacts.require("NinjaOracle");
const NinjaGovernance = artifacts.require("NinjaGovernance");
const NinjaGiveaway = artifacts.require("NinjaGiveaway");

const BN = require('bn.js');
const truffleAssert = require('truffle-assertions');

function toEthSignedMessageHash(hash) {
  // 32 is the length in bytes of hash,
  // enforced by the type signature above
  return web3.utils.keccak256(web3.utils.encodePacked("\x19Ethereum Signed Message:\n32", hash));
}

function fixSignature(signature) {
  ending = signature.substr(130);
  ending = (parseInt(ending,16)+27).toString(16)
  signature = signature.substr(0,130)+ending;
  return signature;
}

async function calculateSignature(orders) {
  var all_hashes = 0
  for (var i = 0; i < orders.length; i++) {
    let hash = hashOrder(orders[i]);
    all_hashes = await web3.utils.keccak256(web3.utils.encodePacked(hash, all_hashes));  
  }  
  signature = await web3.eth.sign(all_hashes, from_address);
  signature = fixSignature(signature);
  return signature;
}

function hashOrder(order) {
  return web3.utils.keccak256(web3.utils.encodePacked(order[0], order[1], order[2]));
}

/**
 * Increase EVM time in ganache-cli to simulate calls in the future
 * @param integer Number of seconds to increase time by
 */
async function increaseTime(integer) {
    // First we increase the time
    await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [integer],
        id: 0,
    }, () => {});

    // Then we mine a block to actually get the time change to occurs
    // See this issue: https://github.com/trufflesuite/ganache-cli/issues/394
    await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: 0,
    }, () => { });
}

contract('NinjaGovernance', async accounts => {
    var ninja;
    var ninja_addr;
    var oracle;
    var governance;
    var giveaway;
    
    var empty_address = 0x0;
    var nonce = 0;
    var emptyorder = [];

    var claimablePerAddress = 1000;
    var totalAllocated = 100000;
  
    beforeEach(async () => {
        governance = await NinjaGovernance.deployed(); 
        ninja_addr = await governance.ninjaToken();
        ninja = await NinjaToken.at(ninja_addr);
        nonce++;
    });
  
    it("Owner should be account[0]", async() => {
        let owner = await governance.owner();
        assert.equal(owner, accounts[0]);
    });
  
    it("NinjaToken owner should be contract address", async() => {
        let owner = await ninja.owner();
        assert.equal(owner, governance.address);
    });

    it("Should allow full developer fund to be available after 4 years", async() => {
        let initial_dev_fund = await governance.developerFundClaimable();
        let devFund = await governance.developerFund()
        let initialSupply = await governance.initialSupply(); 

        let expected_initial_dev_fund = initialSupply * 0.1;
        let initial_dev_fund_plus = initial_dev_fund * 1.001;
        let initial_dev_fund_minus = initial_dev_fund * 0.999;
        assert.isTrue(expected_initial_dev_fund > initial_dev_fund_minus, "Initial dev fund not 10%");
        assert.isTrue(expected_initial_dev_fund < initial_dev_fund_plus, "Initial dev fund not 10%");

        increaseTime((4 * 365 * 24 * 60 * 60) - 1000);
        let soon_before_end_dev_fund = await governance.developerFundClaimable();
        assert.isTrue(devFund.totalAllocated.gt(soon_before_end_dev_fund), "Dev fund claimable too early");

        increaseTime(1000);
        let end_dev_fund = await governance.developerFundClaimable();
        assert.isTrue(devFund.totalAllocated.eq(end_dev_fund), "Dev fund not fully claimable after 4 years");

        increaseTime(1 * 365 * 24 * 60 * 60);
        let past_end_dev_fund = await governance.developerFundClaimable();
        assert.isTrue(devFund.totalAllocated.eq(past_end_dev_fund), "Dev fund increased after 4 years");
    });

    it("Should create new giveaway fund", async() => {
        giveaway = await NinjaGiveaway.new(ninja.address, governance.address, claimablePerAddress, totalAllocated);

        assert.equal(totalAllocated, await giveaway.totalAllocated(), "Total allocated not set properly in constructor");
        assert.equal(0, await giveaway.totalClaimed(), "Total claimed not set properly in constructor");

        // Before adding giveaway
        let giveaway_fund = await governance.giveawayFunds(giveaway.address);
        assert.equal(0x0, giveaway_fund.totalAllocated);

        // Add giveaway
        await governance.addGiveawayFund(giveaway.address, totalAllocated);
        giveaway_fund = await governance.giveawayFunds(giveaway.address);
        assert.equal(totalAllocated, giveaway_fund.totalAllocated);
        assert.equal(totalAllocated, await ninja.allowance(governance.address, giveaway.address), "Giveaway fund allowance not 100000");
    });

    it("Should enable a giveaway and allow someone to claim from it once", async() => {
        let active = await giveaway.active();
        assert.equal(active, false, "Giveaway already active");

        await giveaway.setActive(true);
        active = await giveaway.active();
        assert.equal(active, true, "Giveaway not activated");

        let claimable = await giveaway.getClaimable(accounts[0]);
        assert.equal(claimable, claimablePerAddress, "Claimable balance wrong");

        let before_claimed = await ninja.balanceOf(accounts[0]);
        await truffleAssert.passes(giveaway.claim(), "Claiming didn't work");
        let after_claimed = await ninja.balanceOf(accounts[0]);
        assert.equal(after_claimed - before_claimed, claimablePerAddress, "Claimed wrong amount");

        claimable = await giveaway.getClaimable(accounts[0]);
        assert.equal(claimable, 0, "Didn't change claimable value after claim");
    });

    it("Should only give amount remaining when claimable exceeds total allocation", async() => {
        let small_allocation = 1000;
        let big_claimablePerAddress = 2000;
        let new_giveaway = giveaway = await NinjaGiveaway.new(ninja.address, governance.address, big_claimablePerAddress, small_allocation);
        let claimable = await new_giveaway.getClaimable(accounts[0]);
        assert.equal(claimable, small_allocation, "Claimable higher than allocation");

        await governance.addGiveawayFund(new_giveaway.address, small_allocation);
        await new_giveaway.setActive(true);
        await new_giveaway.claim();
        await truffleAssert.fails(
            new_giveaway.setGiveawayAmount(big_claimablePerAddress, 100),
            truffleAssert.ErrorType.REVERT,
            null,
            "Shouldn't set allocation below amount claimed");
    });
  
  });