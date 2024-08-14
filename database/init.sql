    BEGIN;

    CREATE TABLE IF NOT EXISTS deposit (
      transactionHash TEXT PRIMARY KEY,
      sender TEXT,         -- Instead of "from"
      receiver TEXT,       -- Instead of "to"
      amount TEXT,
      isEth BOOLEAN,
      extraData TEXT,
      remoteToken TEXT,
      localToken TEXT,
      blockNumber INTEGER,
      addressContract TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS withdrawal (
      l1Token TEXT,
      l2Token TEXT,
      sender TEXT,
      receiver TEXT,
      amount TEXT,
      extraData TEXT,
      transactionHash TEXT PRIMARY KEY,
      blockNumber INTEGER,
      addressContract TEXT
    );

    CREATE TABLE real_time_tracker_deposit (
    id SERIAL PRIMARY KEY,
    last_block BIGINT NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE past_event_tracker_deposit (
        id SERIAL PRIMARY KEY,
        last_block BIGINT NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE real_time_tracker_withdrawal (
      id SERIAL PRIMARY KEY,
      last_block BIGINT NOT NULL,
      processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE past_event_tracker_withdrawal (
        id SERIAL PRIMARY KEY,
        last_block BIGINT NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS deposit_sender_index ON deposit (sender);
    CREATE INDEX IF NOT EXISTS deposit_receiver_index ON deposit (receiver);

    CREATE INDEX IF NOT EXISTS withdrawal_sender_index ON withdrawal (sender);
    CREATE INDEX IF NOT EXISTS withdrawal_receiver_index ON withdrawal (receiver);

    COMMIT;