#[test_only]
module ufc_strike::bet_test {
    use std::signer;
    use std::option;
    use std::string;
    use aptos_framework::account;
    use aptos_framework::debug::print;

    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use ufc_strike::bet;
    use ufc_strike::token_helper;

    /// Helper to print u64 in a readable way
    fun print_u64(x: u64) {
        print(&x);
    }

    /// Helper to print address in a readable way
    fun print_address(addr: address) {
        print(&addr);
    }

    /// Helper to print a table row with label and value
    fun print_table_row(label: vector<u8>, value: vector<u8>) {
        print(&string::utf8(b"|  "));
        print(&string::utf8(label));
        print(&string::utf8(b": "));
        print(&string::utf8(value));
        print(&string::utf8(b"                    |"));
    }

    /// Helper function to print bet information as a table
    fun print_bet_info(bet_id: u64, event_id: u64, maker: address, maker_result: std::string::String, amount: u64) {
        print(&string::utf8(b"--- BET INFO ---"));
        print(&string::utf8(b"Bet ID: "));
        print_u64(bet_id);
        print(&string::utf8(b"Event ID: "));
        print_u64(event_id);
        print(&string::utf8(b"Maker: "));
        print_address(maker);
        print(&string::utf8(b"Maker Result: "));
        print(&maker_result);
        print(&string::utf8(b"Amount: "));
        print_u64(amount);
        print(&string::utf8(b" tokens"));
        print(&string::utf8(b"----------------"));
    }

    /// Helper function to print complete bet information (including taker)
    fun print_bet_info_complete(bet_id: u64, event_id: u64, maker: address, maker_result: std::string::String, amount: u64, taker: address, taker_result: std::string::String) {
        print(&string::utf8(b"--- COMPLETE BET INFO ---"));
        print(&string::utf8(b"Bet ID: "));
        print_u64(bet_id);
        print(&string::utf8(b"Event ID: "));
        print_u64(event_id);
        print(&string::utf8(b"Maker: "));
        print_address(maker);
        print(&string::utf8(b"Maker Result: "));
        print(&maker_result);
        print(&string::utf8(b"Taker: "));
        print_address(taker);
        print(&string::utf8(b"Taker Result: "));
        print(&taker_result);
        print(&string::utf8(b"Amount: "));
        print_u64(amount);
        print(&string::utf8(b" tokens"));
        print(&string::utf8(b"------------------------"));
    }



    #[test(creator = @ufc_strike, user = @0x123, taker = @0x456)]
    fun test_create_bet(creator: &signer, user: &signer, taker: &signer) { 
        // Set up timestamp for testing
        let aptos_framework = account::create_signer_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&aptos_framework);

        // Initialize the bet counter
        bet::init_for_testing(creator);

        // Create token for bets using the helper
        let (mint_ref, _, _, _, metadata) = token_helper::create_fungible_asset(creator);
          
        // Verify initial supply
        token_helper::assert_token_supply(metadata, 0);
  
        // Mint tokens to maker (user) using the helper - 1 million tokens
        token_helper::mint_tokens_to_account(&mint_ref, user, 1000000);
        token_helper::assert_token_supply(metadata, 1000000);
        token_helper::assert_account_balance(user, metadata, 1000000);
        
        // Mint tokens to taker using the helper - 1 million tokens
        token_helper::mint_tokens_to_account(&mint_ref, taker, 1000000);
        token_helper::assert_token_supply(metadata, 2000000);
        token_helper::assert_account_balance(taker, metadata, 1000000);

        // Initial balances (before creating/taking the bet)
        let maker_balance_before_bet = primary_fungible_store::balance(signer::address_of(user), metadata);
        print(&string::utf8(b"Maker balance before bet: "));
        print(&maker_balance_before_bet);
        let taker_balance_before_take = primary_fungible_store::balance(signer::address_of(taker), metadata);
        print(&string::utf8(b"Taker balance before take: "));
        print(&taker_balance_before_take);
        
        // First create an event
        let event_category = b"UFC Championship";
        let event_name = b"UFC 280 - Oliveira vs Makhachev";
        let event_description = b"Lightweight Championship bout between Charles Oliveira and Islam Makhachev";
        let deadline_to_join = 1700000000; // Future timestamp for deadline
        let resolution_timeout = 86400; // 24 hours in seconds
        
        bet::create_event(
            creator, // only admin can create events
            event_category,
            event_name,
            event_description,
            deadline_to_join,
            resolution_timeout
        );
        
        // Verify that the event was created
        let event_id = 1; // First event created
        assert!(bet::event_exists(event_id), 1);
        
        // Show information of the created event
        let event_info = bet::get_event_info(event_id);
        print(&string::utf8(b"Event created: "));
        print(&event_info);
        
        // Now create a bet within that event
        let maker_result = b"Oliveira wins by submission";
        let bet_amount = 300000; // 300k tokens for the bet
        let fee_percentage = 300; // 3%
        let deadline = option::none<u64>();
        
        bet::create_bet(
            user,    // maker
            event_id,
            maker_result,
            metadata,
            bet_amount,
            fee_percentage,
            deadline
        );
        
        // Maker balance after creating the bet
        let maker_balance_after_bet = primary_fungible_store::balance(signer::address_of(user), metadata);
        print(&string::utf8(b"Maker balance after bet: "));
        print(&maker_balance_after_bet);

        // Verify that the maker has fewer tokens after creating the bet
        // Should have 1,000,000 - 300,000 = 700,000 tokens
        token_helper::assert_account_balance(user, metadata, 700000);
        
        // Get and show information of the created bet
        let bet_id = 1;
        let _bet_info = bet::get_bet_info(event_id, bet_id);
        
        // Verify treasury balance after creating the bet
        let treasury_balance = bet::get_bet_balance(event_id, bet_id);
        print(&string::utf8(b"Treasury balance: "));
        print(&treasury_balance);
        // Should have 300,000 tokens (only from maker)
        assert!(treasury_balance == 300000, 2);

        // The taker takes the bet
        let taker_result = b"Makhachev wins by decision";
        bet::take_bet(taker, event_id, bet_id, taker_result);
        
        // Taker balance after taking the bet
        let taker_balance_after_take = primary_fungible_store::balance(signer::address_of(taker), metadata);
        print(&string::utf8(b"Taker balance after take: "));
        print(&taker_balance_after_take);

        // Verify that the taker has fewer tokens after taking the bet
        // Should have 1,000,000 - 300,000 = 700,000 tokens
        token_helper::assert_account_balance(taker, metadata, 700000);
        
       
        // Print complete bet information
        // print_bet_info_complete(bet_id_final, bet_event_id, bet_maker, bet_maker_result, bet_amount, bet_taker, bet_taker_result);
        
        // Verify treasury balance after the taker takes the bet
        let treasury_balance_after_taker = bet::get_bet_balance(event_id, bet_id);
        print(&string::utf8(b"Treasury balance after taker: "));
        print(&treasury_balance_after_taker);
        // Should have 600,000 tokens (300,000 from maker + 300,000 from taker)
        assert!(treasury_balance_after_taker == 600000, 3);
        
        // Get complete bet information using get_bet_info
        let result = bet::get_bet_info(event_id, bet_id);
        print(&result);
        
        // Resolve the bet in favor of the maker (only sets the winner)
        bet::resolve_bet(creator, event_id, bet_id, signer::address_of(user));
        
        let result_after_resolve = bet::get_bet_info(event_id, bet_id);
        print(&result_after_resolve);
        
        // Verify that the bet is resolved but not claimed
        let claimed = bet::get_bet_claimed(event_id, bet_id);
        assert!(claimed == false, 4);
        
        // Verify that the treasury still has the funds
        let treasury_balance_after_resolve = bet::get_bet_balance(event_id, bet_id);
        assert!(treasury_balance_after_resolve == 600000, 5);
        
        // Creator balance before claim (should not have changed)
        let creator_balance_before_claim = primary_fungible_store::balance(signer::address_of(creator), metadata);
        print(&string::utf8(b"Creator balance before claim: "));
        print(&creator_balance_before_claim);
        
        // The winner claims their winnings
        bet::claim_winnings(user, event_id, bet_id);
        
        // Creator balance after claim (should have received the fees)
        let creator_balance_after_claim = primary_fungible_store::balance(signer::address_of(creator), metadata);
        print(&string::utf8(b"Creator balance after claim: "));
        print(&creator_balance_after_claim);
        
        // Verify that the maker received the winnings (minus fees)
        // Total pot: 600,000; fee: 600,000 * 300 / 10,000 = 18,000; winnings: 600,000 - 18,000 = 582,000
        // Maker had 700,000, now should have 700,000 + 582,000 = 1,282,000
        let maker_balance_after = primary_fungible_store::balance(signer::address_of(user), metadata);
        print(&string::utf8(b"Maker balance after claim: "));
        print(&maker_balance_after);
        token_helper::assert_account_balance(user, metadata, 1282000);
        
        // Verify that the treasury is empty after claim
        let treasury_balance_after_claim = bet::get_bet_balance(event_id, bet_id);
        assert!(treasury_balance_after_claim == 0, 6);
        
        // Verify that the bet is marked as claimed
        let claimed_final = bet::get_bet_claimed(event_id, bet_id);
        assert!(claimed_final == true, 7);

        // Print metadata
        let metadata_object = token_helper::get_metadata(creator);
        print(&string::utf8(b"Metadata: "));
        print(&metadata_object);

    }

    

  
} 