#!/usr/bin/env python3

import asyncio
import websockets
import json
import os
import random
import psycopg2
import time

from web3 import Web3
from IPython import embed
from hexbytes import HexBytes

class NinjaOracleBackend:
    def __init__(self, dbname):
        random.seed()
        self.w3 = Web3(Web3.WebsocketProvider("ws://127.0.0.1:9545"))
        self.db = psycopg2.connect(
            database=dbname, 
            user="postgres", 
            password="e8a48653851e28c69d0506508fb27fc5", 
            host="127.0.0.1", port="5432")
        self.cur = self.db.cursor()
        self.loadContracts()


    def sql_insertOrders(self, orders):
        for order in orders:
            # print(order)
            self.cur.execute("""INSERT INTO orders VALUES 
            (%(from)s, %(depositTransaction)s, %(status)s, %(hash)s, %(to)s, %(amount)s, %(nonce)s);""", order)
        self.db.commit()

    
    def sql_insertDeposits(self, events):
        for event in events:
            print(event)
            deposit = {
                    "from": event["args"]["from"],
                    "amount": event["args"]["value"],
                    "transactionHash": event["transactionHash"].hex()
            }
            self.cur.execute("""INSERT INTO deposits VALUES
            (%(from)s, %(amount)s, %(transactionHash)s);""", deposit)
        self.db.commit()


    def sql_retrieveOrderByHash(self, hash):
        self.cur.execute("select * from orders where hash = %(hash)s", {"hash": hash})
        return self.cur.fetchall()


    def sql_retrieveRandomOrders(self, num_orders):
        self.cur.execute("select * from orders where status = 'pending' order by random() limit %(num_orders)s", {"num_orders": num_orders})
        return self.cur.fetchall()


    def hashOrder(self, order):
        return self.w3.solidityKeccak(
            ["address", "uint256", "bytes32"],
            [order["to"],int(order["amount"]), order["nonce"]])
    

    def fixSignature(self, signature):
        ending = int(signature[-2:].hex(),16)
        ending = hex(ending+27)
        return signature[:-2] + HexBytes(ending)


    def calculateSignature(self, orders):
        all_hashes = 0
        for order in orders:
            hash = self.hashOrder(order).hex()
            if all_hashes == 0:
                all_hashes = self.w3.solidityKeccak(
                    ["bytes32", "uint256"],
                    [hash, all_hashes]
                )
            else:
                all_hashes = self.w3.solidityKeccak(
                    ["bytes32","bytes32"],
                    [hash, all_hashes]
                )
            
        signature = self.w3.eth.sign(self.w3.eth.accounts[0], data=all_hashes)
        signature = self.fixSignature(signature)
        return "0x"+signature.hex()


    def getNonce(self):
        return os.urandom(32)


    async def sendMessage(self, websocket, msg):
        print(f"> {msg}")
        await websocket.send(msg)


    def handleNinjaTransfer(self, json_msg):
        order = dict()
        order = {
            "to": json_msg["to"],
            "amount": json_msg["amount"],
            "nonce": str(self.getNonce())
        }
        order.update({
            "from": "0x0000000000000000000000000000000000000000",
            "depositTransaction": json_msg["depositTransaction"],
            "status": "pending",
            "hash": self.hashOrder(order).hex()
        })


    async def processMessage(self, websocket, msg):
        json_msg = json.loads(msg)
        msg_type = json_msg["type"]
        if msg_type == "NinjaTransfer":
            await self.sendMessage(websocket, "NinjaTransfer received")
            self.handleNinjaTransfer(json_msg)
        elif msg_type == "RequestOrders":
            num_orders = json_msg["numOrders"]
            orders = self.retrieveRandomOrders(num_orders)
            await self.sendMessage(websocket, orders)


    def retrieveRandomOrders(self, num_orders):
        msg = dict()
        orders = []
        order_rows = self.sql_retrieveRandomOrders(num_orders)
        for order_row in order_rows:
            print(order_row)
            orders.append({
                "to": order_row[4],
                "amount": order_row[5],
                "nonce": order_row[6],
            })

        msg["Orders"] = orders
        msg["Signature"] = self.calculateSignature(orders)
        msg["Type"] = "DispatchOrders"

        json_msg = json.dumps(msg)
        return json_msg


    def loadContracts(self):
        # Load NinjsOracle
        with open("../app/src/contracts/NinjaOracle.json") as file:
            oracle_abi = json.load(file)["abi"]
            oracle_address = "0x3ff32CF343C38ce60ab13697dc120606FDF00b51"
            self.oracle = self.w3.eth.contract(abi=oracle_abi, address=oracle_address)

        # Load NinjaToken
        with open("../app/src/contracts/NinjaToken.json") as file:
            ninja_abi = json.load(file)["abi"]
            ninja_address = self.oracle.functions.ninjaToken().call()
            self.ninja = self.w3.eth.contract(abi=ninja_abi, address=ninja_address)


    def subscribeToEvents(self):
        self.ninja_transaction_filter = self.ninja.events.Transfer.createFilter(fromBlock="latest", argument_filters={'to': self.oracle.address})
        

    async def handleEvents(self):
        while True:
            events = self.ninja_transaction_filter.get_new_entries()
            self.sql_insertDeposits(events)
            await asyncio.sleep(1)


    async def serve(self, websocket, path):
        while True:
            msg = await websocket.recv()
            print(f"< {msg}")
            await self.processMessage(websocket, msg)


    def startServer(self):
        start_server = websockets.serve(self.serve, "localhost", 8765)

        loop = asyncio.get_event_loop()
        loop.create_task(self.handleEvents())
        loop.run_until_complete(start_server)
        loop.run_forever()


if __name__ == "__main__":
    oracle = NinjaOracleBackend("orders")
    oracle.startServer()







        







