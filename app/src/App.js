import React from "react";
import { DrizzleContext } from "@drizzle/react-plugin";
import { Drizzle } from "@drizzle/store";
import drizzleOptions from "./drizzleOptions";
import MainComponent from "./MainComponent";
import ReconnectingWebSocket from 'reconnecting-websocket';
import "./App.css";


const drizzle = new Drizzle(drizzleOptions);
const ws = new ReconnectingWebSocket("ws://127.0.0.1:8765");

const App = () => {
  return (
    <DrizzleContext.Provider drizzle={drizzle}>
      <DrizzleContext.Consumer>
        {drizzleContext => {
          const { drizzle, drizzleState, initialized } = drizzleContext;

          
          if (!initialized) {
            return "Loading..."
          }      
          
          drizzle.ws = ws;
          drizzle.ws.onopen = function (event) {
            console.log("WS Opened");
          }
          // Listen for messages
          drizzle.ws.onmessage = function (event) {
            console.log('Message from server ', event.data);
          };

          drizzle.ws.onclose = function (event) {
            console.log("WS Closed");
          }


          return (
            <MainComponent drizzle={drizzle} drizzleState={drizzleState} />
          )
        }}
      </DrizzleContext.Consumer>
    </DrizzleContext.Provider>
  );
}

export default App;
