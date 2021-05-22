const NinjaToken = artifacts.require("NinjaToken");
const NinjaOracle = artifacts.require("NinjaOracle");
const NinjaGovernance = artifacts.require("NinjaGovernance");
const ECDSA = artifacts.require("ECDSA");

const { zeroAddress } = require('ethereumjs-util');
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
contract('NinjaToken', async accounts => {
  var governance;
  var ninja;
  var oracle;
  var ecdsa;

  var empty_address = '0x0000000000000000000000000000000000000000';
  var amount;
  var nonce = 0;
  var emptyorder = [];

  beforeEach(async () => {
    governance = await NinjaGovernance.deployed();
    let ninja_addr = await governance.ninjaToken();
    ninja = await NinjaToken.at(ninja_addr);
    oracle = await NinjaOracle.deployed();
    ecdsa = await ECDSA.deployed(); 
    
    from_address = accounts[0];
    to_address = accounts[2];
    amount = 100;
    nonce++;
    emptyorder[0] = [empty_address, 0, nonce];
    emptysignature = calculateSignature(emptyorder);

  });

  it("Should put 10000 NinjaToken in the first account", async() => {
    let instance = await NinjaToken.deployed();
    let balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(balance,10000);
  });

  it("Should send coin correctly", async() => {
    // Get initial balances of first and second account.
    let account_one = accounts[0];
    let account_two = accounts[1];

    let amount = 10;

    let balance = await ninja.balanceOf.call(account_one);
    let account_one_starting_balance = balance;

    balance = await ninja.balanceOf.call(account_two);
    let account_two_starting_balance = balance;
    await ninja.transfer(account_two, amount, { from: account_one });

    balance = await ninja.balanceOf.call(account_one);
    let account_one_ending_balance = balance;

    balance = await ninja.balanceOf.call(account_two);
    let account_two_ending_balance = balance;

    assert.equal(
      account_one_ending_balance,
      (account_one_starting_balance - amount),
      "Amount wasn't correctly taken from the sender"
    );
    assert.equal(
      account_two_ending_balance.toNumber(),
      (account_two_starting_balance.toNumber() + amount),
      "Amount wasn't correctly sent to the receiver"
    );
  });

  it("Should send to NinjaToken contract address", async() => {
    let amount = new web3.utils.BN(1000);

    let balance = await ninja.balanceOf.call(accounts[0]);
    let account_one_starting_balance = balance;

    balance = await ninja.balanceOf.call(oracle.address);
    let contract_starting_balance = balance;

    let order = [oracle.address, amount, nonce];
    let signature = await calculateSignature([order]);
    await ninja.ninjaTransferUntrusted(amount, oracle.address, [order], signature);

    balance = await ninja.balanceOf.call(accounts[0]);
    assert.isTrue(balance.eq(account_one_starting_balance.sub(amount)), "Account 1 ending balance incorrect");

    balance = await ninja.balanceOf.call(oracle.address);
    assert.isTrue(balance.eq(contract_starting_balance.add(amount)), "Token contract ending balance incorrect");
  });

  it("Should emit an OrderCompleted event first, then ignore replayed order", async() => {
    let order = [to_address, amount, nonce]
    let hash = hashOrder(order);
    let result = await oracle.getOrderStatus(hash);
    assert.equal(result, NinjaOracle.OrderStatus.NULL, "Order status not NULL");

    let signature = await calculateSignature([order]);
    result = await oracle.completeOrder.sendTransaction(to_address, amount, nonce, signature);
    await truffleAssert.eventEmitted(result, "OrderCompleted");

    result = await oracle.getOrderStatus(hash);
    assert.equal(result, NinjaOracle.OrderStatus.COMPLETED, "Order status not COMPLETED"); 

    result = await oracle.completeOrder.sendTransaction(to_address, amount, nonce, signature); 
    await truffleAssert.eventNotEmitted(result, "OrderCompleted");
  });

  it("Should increase to account balance by num_orders * amount", async() => {
    var to_addr_start = await ninja.balanceOf(to_address);
    let num_orders = 5;

    orders = [];
    hashes = [];
    all_hashes = 0;
    for (let i = 0; i < num_orders; i++) {
      nonce++;
      hash = hashOrder([to_address, amount, nonce]);
      orders.push([to_address, amount, nonce]);
      hashes.push(hash);
    }
    let signature = await calculateSignature(orders);
    // Complete orders
    result = await ninja.ninjaTransferUntrusted(amount * num_orders, oracle.address, orders, signature);

    var to_addr_finish = await ninja.balanceOf(to_address);    
    to_addr_start = to_addr_start.toNumber();
    to_addr_finish = to_addr_finish.toNumber();
    assert.equal(to_addr_finish, to_addr_start + (amount * num_orders), "Destination address ending balance incorrect");

  });

  it("Signature fails when one of the orders is modified", async() => {
    var num_orders = 5;
    orders = [];
    hashes = [];
    all_hashes = 0;
    for (let i = 0; i < num_orders; i++) {
      nonce++;
      hash = hashOrder([to_address, amount, nonce]);
      orders.push([to_address, amount, nonce]);
      hashes.push(hash);
    }
    let signature = await calculateSignature(orders);

    // Modify order 
    orders[0][2] += 1000;
    // Complete orders
    await truffleAssert.fails(
      ninja.ninjaTransferUntrusted(amount * num_orders, oracle.address, orders, signature), 
      truffleAssert.ErrorType.REVERT, 
      "Invalid signature");
  });

  it("Shouldn't let submit own order without other orders", async() => {
    let signature = await calculateSignature([]);
    await truffleAssert.fails(
      ninja.ninjaTransferUntrusted(100, oracle.address, [], signature), 
      truffleAssert.ErrorType.REVERT, 
      "Invalid signature");
  });

  it("Should approve a signed stub transaction transaction only once", async() => {
    let order = [empty_address, 0, nonce];
    let signature = await calculateSignature([order]);

    // Should pass the first time to allow signed stub orders when there are no valid orders
    await truffleAssert.passes(
      ninja.ninjaTransferUntrusted(100, oracle.address, [order], signature),
      "Signed stub transaction should pass"
    );
    
    // Should fail the second time to prevent replay of empty stub transactions
    await truffleAssert.fails(
      ninja.ninjaTransferUntrusted(100, oracle.address, [order], signature),
      truffleAssert.ErrorType.REVERT,
      "Can't replay empty transaction"
    );
  });

});

