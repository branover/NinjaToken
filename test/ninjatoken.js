const NinjaToken = artifacts.require("NinjaToken");
const NinjaOracle = artifacts.require("NinjaOracle");
const ECDSA = artifacts.require("ECDSA");

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
  var ninja;
  var oracle;
  var ecdsa;

  var address;
  var amount;
  var nonce;
  // var hash;
  // var signature;

  beforeEach(async () => {
    ninja = await NinjaToken.deployed();
    oracle = await NinjaOracle.deployed();
    ecdsa = await ECDSA.deployed(); 
    
    from_address = accounts[0];
    to_address = accounts[2];
    amount = 100;
    nonce = 0;

    // hash = await web3.utils.keccak256(web3.utils.encodePacked(to_address, amount, nonce));
    // signature = await web3.eth.sign(hash, from_address);
    // signature = fixSignature(signature);
  });

  it("Should put 10000 NinjaToken in the first account", async() => {
    let instance = await NinjaToken.deployed();
    let balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(balance.valueOf(), 10000);
  });

  it("Should send coin correctly", async() => {
    // Get initial balances of first and second account.
    let account_one = accounts[0];
    let account_two = accounts[1];

    let amount = 10;

    let balance = await ninja.balanceOf.call(account_one);
    let account_one_starting_balance = balance.toNumber();

    balance = await ninja.balanceOf.call(account_two);
    let account_two_starting_balance = balance.toNumber();
    await ninja.transfer(account_two, amount, { from: account_one });

    balance = await ninja.balanceOf.call(account_one);
    let account_one_ending_balance = balance.toNumber();

    balance = await ninja.balanceOf.call(account_two);
    let account_two_ending_balance = balance.toNumber();

    assert.equal(
      account_one_ending_balance,
      account_one_starting_balance - amount,
      "Amount wasn't correctly taken from the sender"
    );
    assert.equal(
      account_two_ending_balance,
      account_two_starting_balance + amount,
      "Amount wasn't correctly sent to the receiver"
    );
  });

  it("Should send to NinjaToken contract address", async() => {
    let amount = 1000;

    let balance = await ninja.balanceOf.call(accounts[0]);
    let account_one_starting_balance = balance.toNumber();

    balance = await ninja.balanceOf.call(oracle.address);
    let contract_starting_balance = balance.toNumber();

    await ninja.ninjaTransferUntrusted(1000, oracle.address, [], 0);

    balance = await ninja.balanceOf.call(accounts[0]);
    assert.equal(balance, account_one_starting_balance - amount, "Account 1 ending balance incorrect");

    balance = await ninja.balanceOf.call(oracle.address);
    assert.equal(balance, contract_starting_balance + amount, "Token contract ending balance incorrect");
  });

  it("Should emit an OrderStored event first, then ignore replayed order", async() => {
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

  // it("Should complete the order", async() => {
  //   let order = [to_address, amount, nonce]
  //   let hash = hashOrder(order);
  //   result = await oracle.getOrderStatus(hash);
  //   assert.equal(result, NinjaOracle.OrderStatus.SUBMITTED, "Order status not SUBMITTED");

  //   result = await oracle.completeOrder(hash);
  //   truffleAssert.eventEmitted(result, "OrderCompleted");
    
  //   result = await oracle.getOrderStatus(hash);
  //   assert.equal(result, NinjaOracle.OrderStatus.COMPLETED, "Order status not COMPLETED");
  // });

  it("Should increase to account balance by num_orders * amount", async() => {
    var to_addr_start = await ninja.balanceOf(to_address);
    var num_orders = 10;

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
    console.log(result.receipt.gasUsed)

    var to_addr_finish = await ninja.balanceOf(to_address);    
    to_addr_start = to_addr_start.toNumber();
    to_addr_finish = to_addr_finish.toNumber();
    assert.equal(to_addr_finish, to_addr_start + (amount * num_orders), "Destination address ending balance incorrect");

  });


});
