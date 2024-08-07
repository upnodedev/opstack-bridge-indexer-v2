#!/bin/sh

# Start the deposit, withdrawal, and server processes
node dist/deposit.js &
node dist/withdrawal.js &
node dist/server.js &

# Wait for all background processes to finish
wait
