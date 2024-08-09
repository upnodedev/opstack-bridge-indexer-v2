    BEGIN;

    CREATE TABLE IF NOT EXISTS deposit (
      transactionHash TEXT PRIMARY KEY,
      "from" TEXT,
      "to" TEXT,
      "amount" TEXT,
      "isEth" BOOLEAN,
      "extraData" TEXT,
      "remoteToken" TEXT,
      "localToken" TEXT,
      blockNumber INTEGER,
      addressContract TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS withdrawal (
      l1Token TEXT,
      l2Token TEXT,
      "from" TEXT,
      "to" TEXT,
      amount TEXT,
      extraData TEXT,
      transactionHash TEXT PRIMARY KEY,
      blockNumber INTEGER,
      addressContract TEXT
    );

    CREATE INDEX IF NOT EXISTS deposit_from_index ON deposit ("from");
    CREATE INDEX IF NOT EXISTS deposit_to_index ON deposit ("to");

    CREATE INDEX IF NOT EXISTS withdrawal_from_index ON withdrawal ("from");
    CREATE INDEX IF NOT EXISTS withdrawal_to_index ON withdrawal ("to");

    COMMIT;