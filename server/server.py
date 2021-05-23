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
        self.nonce = self.getNonce()
        self.order_pool = []


    def sql_insertOrders(self, orders):
        for order in orders:
            print(order)
            self.cur.execute("INSERT INTO orders VALUES ('{}', '{}', '{}', '{}', '{}', '{}', {});".format(
                order["Meta"]["from"],
                order["Meta"]["createdAt"],
                order["Meta"]["status"],
                order["Meta"]["hash"],
                order["DispatchOrder"]["to"],
                order["DispatchOrder"]["amount"],
                order["DispatchOrder"]["nonce"],
            ))
        self.db.commit()
        pass

    def sql_retrieveOrderByHash(self, orders):
        pass

    def sql_retrieveRandomOrders(self, num_orders):
        self.cur.execute("select * from orders order by random() limit {}".format(num_orders))
        return self.cur.fetchall()

    def hashOrder(self, order):
        return self.w3.solidityKeccak(
            ["address", "uint256", "uint256"],
            [order["to"],int(order["amount"]), int(order["nonce"])])

    def getNonce(self):
        nonce = os.urandom(32)
        self.nonce = int.from_bytes(nonce, "little")
        return self.nonce

    async def sendMessage(self, websocket, msg):
        print(f"> {msg}")
        await websocket.send(msg)

    def handleNinjaTransfer(self, json_msg):
        order = dict()
        order["DispatchOrder"] = {
            "to": "0x0000000000000000000000000000000000000000",
            "amount": "0",
            "nonce": str(self.getNonce())
        }
        order["Meta"] = {
            "from": "0x0000000000000000000000000000000000000000",
            "createdAt": int(time.time()),
            "status": "pending",
            "hash": self.hashOrder(order["DispatchOrder"]).hex()
        }


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


    def getSignature(self, orders):
        return "0x41424344"

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
        msg["Signature"] = self.getSignature(orders)
        msg["Type"] = "DispatchOrders"

        json_msg = json.dumps(msg)
        return json_msg


    async def serve(self, websocket, path):
        while True:
            msg = await websocket.recv()
            print(f"< {msg}")
            await self.processMessage(websocket, msg)


    def startServer(self):
        self.start_server = websockets.serve(self.serve, "localhost", 8765)

        asyncio.get_event_loop().run_until_complete(self.start_server)
        asyncio.get_event_loop().run_forever()


if __name__ == "__main__":
    oracle = NinjaOracleBackend("orders")
    oracle.startServer()







        







