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
from server import NinjaOracleBackend

NUM_TEST_ORDERS = 10

class MockOracle(NinjaOracleBackend):
    def __init__(self, dbname):
        super().__init__(dbname)
        random.seed(b"12345")
        self.initDatabase()
        self.createMockOrders(NUM_TEST_ORDERS)
        self.subscribeToEvents()

        print("Server initialized")


    def initDatabase(self):
        self.cur.execute('''CREATE TABLE IF NOT EXISTS orders
            ("from" TEXT, "depositTransaction" TEXT, "status" TEXT, "hash" TEXT PRIMARY KEY, "to" TEXT, "amount" TEXT, "nonce" TEXT)''')
        self.cur.execute('''CREATE TABLE IF NOT EXISTS deposits
            ("from" TEXT, "amount" TEXT, "transactionHash" TEXT PRIMARY KEY)''')

        try:
            self.cur.execute("TRUNCATE TABLE orders, deposits")
        except:
            print("Failed to trucate tables, might not exist")
            self.db.commit()
        self.db.commit()


    def createMockOrders(self, num_orders):
        orders = []
        for n in range(num_orders):
            order = dict()
            order = {
                "to": "0xbd1102691192aB35bD8835b98761162c73cD0C6F",
                "amount": random.randrange(1, 100),
                "nonce": HexBytes(self.getNonce()).hex()
            }

            order.update({
                "from": "0xE95A7D4f974E160Db21C77CcCaA39f543AE1d574",
                "depositTransaction": "0x0",
                "status": "pending",
                "hash": self.hashOrder(order).hex()
            })
            orders.append(order)
        self.sql_insertOrders(orders)



    def retrieveOrders(self):
        self.cur.execute("SELECT * from orders")
        rows = self.cur.fetchall()
        for row in rows:
            print(str(row))


if __name__ == "__main__":
    oracle = MockOracle("testorders")
    oracle.startServer()







        







