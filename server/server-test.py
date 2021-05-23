#!/usr/bin/env python3

from server import *

NUM_TEST_ORDERS = 10

class MockOracle(NinjaOracleBackend):
    def __init__(self, dbname):
        super().__init__(dbname)
        random.seed(b"12345")
        self.initDatabase()
        self.createMockOrders(NUM_TEST_ORDERS)
        self.retrieveOrders()


    def initDatabase(self):
        try:
            self.cur.execute("DROP TABLE orders")
        except:
            print("Failed to drop table, might not exist")
        self.cur.execute('''CREATE TABLE orders
            ("from" TEXT, "createdAt" TEXT, "status" TEXT, "hash" TEXT PRIMARY KEY, "to" TEXT, "amount" TEXT, "nonce" TEXT)''')
        self.db.commit()


    def createMockOrders(self, num_orders):
        orders = []
        for n in range(num_orders):
            order = dict()
            order["DispatchOrder"] = {
                "to": "0xbd1102691192aB35bD8835b98761162c73cD0C6F",
                "amount": random.randrange(1, 100),
                "nonce": str(self.getNonce())
            }

            order["Meta"] = {
                "from": "0xE95A7D4f974E160Db21C77CcCaA39f543AE1d574",
                "createdAt": int(time.time()),
                "status": "pending",
                "hash": self.hashOrder(order["DispatchOrder"]).hex()
            }
            orders.append(order)
        self.sql_insertOrders(orders)


    def retrieveOrders(self):
        self.cur.execute("SELECT * from orders")
        rows = self.cur.fetchall()
        for row in rows:
            print(str(row))


if __name__ == "__main__":
    # oracle = MockOracle(":memory:")
    oracle = MockOracle("testorders")
    oracle.startServer()







        







