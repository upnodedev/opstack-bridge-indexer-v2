    BEGIN;

    CREATE TABLE IF NOT EXISTS transactions (
      transactionHash TEXT PRIMARY KEY,
      sender TEXT,         
      receiver TEXT,       
      amount TEXT,
      isEth BOOLEAN DEFAULT NULL,
      extraData TEXT,
      remoteToken TEXT DEFAULT NULL,
      localToken TEXT DEFAULT NULL,
      blockNumber BIGINT,
      addressContract TEXT,
      version TEXT DEFAULT NULL,
      l1Token TEXT DEFAULT NULL,
      l2Token TEXT DEFAULT NULL,
      transactionType TEXT,  -- to distinguish between deposit and withdrawal
      withdrawalHash TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prove_transactions (
      transactionHash TEXT PRIMARY KEY,
      withdrawalHash TEXT,
      blockNumber BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS finalize_transactions (
      transactionHash TEXT PRIMARY KEY,
      withdrawalHash TEXT,
      blockNumber BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE tracker(
      config TEXT PRIMARY KEY,
      last_block BIGINT,
      processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- create config

    INSERT INTO tracker (config) VALUES ('real_time_deposit');
    INSERT INTO tracker (config) VALUES ('past_time_deposit');

    INSERT INTO tracker (config) VALUES ('real_time_withdrawal_initiated');
    INSERT INTO tracker (config) VALUES ('past_time_withdrawal_initiated');

    INSERT INTO tracker (config) VALUES ('real_time_withdrawal_proven');
    INSERT INTO tracker (config) VALUES ('past_time_withdrawal_proven');

    INSERT INTO tracker (config) VALUES ('real_time_withdrawal_finalized');
    INSERT INTO tracker (config) VALUES ('past_time_withdrawal_finalized');

    -- add index
    CREATE INDEX IF NOT EXISTS transactions_withdrawal_hash_index ON transactions (withdrawalHash);

    COMMIT;