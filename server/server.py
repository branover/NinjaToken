#!/usr/bin/env python3

import asyncio
import websockets
import json
import os

from web3 import Web3
from IPython import embed
from collections import namedtuple

Order = namedtuple("Order", "to amount nonce")

class NinjaOracleBackend:
    def __init__(self):
        self.w3 = Web3(Web3.WebsocketProvider("ws://127.0.0.1:9545"))
        self.nonce = self.getNonce()

    def getNonce(self):
        nonce = os.urandom(32)
        self.nonce = int.from_bytes(nonce, "little")
        return self.nonce

    async def sendMessage(self, websocket, msg):
        print(f"> {msg}")
        await websocket.send(msg)


    async def processMessage(self, websocket, msg):
        json_msg = json.loads(msg)
        msg_type = json_msg["type"]
        if msg_type == "NinjaTransfer":
            await self.sendMessage(websocket, "NinjaTransfer received")
        elif msg_type == "RequestOrders":
            num_orders = json_msg["numOrders"]
            orders = self.getOrders(num_orders)
            await self.sendMessage(websocket, orders)


    def getSignature(self, orders):
        return "testsignature"


    def getOrders(self, num_orders):
        orders = dict()
        orders["Orders"] = []
        order1 = Order(
            "0x0000000000000000000000000000000000000000",
            "0",
            str(self.getNonce()))

        order2 = Order(
            "0x0000000000000000000000000000000000000000",
            "0",
            str(self.getNonce()))
        orders["Orders"].append(order1._asdict())
        orders["Orders"].append(order2._asdict())
        orders["Signature"] = self.getSignature(orders["Orders"])

        json_order = json.dumps(orders)
        return json_order


    async def serve(self, websocket, path):
        while True:
            msg = await websocket.recv()
            print(f"< {msg}")
            await self.processMessage(websocket, msg)


    def startServer(self):
        self.start_server = websockets.serve(self.serve, "localhost", 8765)

        asyncio.get_event_loop().run_until_complete(self.start_server)
        asyncio.get_event_loop().run_forever()


oracle = NinjaOracleBackend()
oracle.startServer()







        







