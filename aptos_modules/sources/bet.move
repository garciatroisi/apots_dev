module ufc_strike::bet {

    use aptos_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::signer;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use std::option::{Self, Option};
    use std::string::{Self, String};
    use std::error;

    /// Counter for unique bet IDs
    struct BetCounter has key {
        value: u64,
    }

    /// Counter for unique event IDs
    struct EventCounter has key {
        value: u64,
    }

    /// Global table that stores all events
    struct EventTable has key {
        events: Table<u64, Event>,  // event_id -> Event
    }

    /// Global table that maps events to their bet tables
    struct EventBetTable has key {
        event_bets: Table<u64, Table<u64, Bet>>,  // event_id -> (bet_id -> Bet)
    }

    /// Event structure
    struct Event has key, store, drop {
        id: u64,                    // Unique event ID
        category: String,           // Event category
        deadline_to_join: u64,      // Deadline to join the event
        resolution_timeout: u64,    // Timeout for event resolution
        name: String,               // Event name
        description: String,        // Event description
        created_at: u64,            // Creation timestamp
        resolved_at: Option<u64>,   // Resolution timestamp
        winner: Option<String>,     // Winning result of the event
    }

    /// Token treasury for each bet
    struct Treasury has key, store, drop {
        store: Object<FungibleStore>,
        extend_ref: ExtendRef,
    }

    /// Bet structure
    struct Bet has key, store, drop {
        id: u64,                          // Unique bet ID
        event_id: u64,                    // Event this bet belongs to
        maker: address,                   // User who creates the bet (maker)
        maker_result: String,             // Result chosen by the maker
        taker: Option<address>,           // User who takes the bet (taker)
        taker_result: Option<String>,     // Taker's result
        token_metadata: Object<Metadata>, // Metadata of the token used for the bet
        amount: u64,                      // Bet amount
        fee_percentage: u64,              // Platform fee (500 = 5%)
        deadline_to_accept: Option<u64>,  // Deadline to accept the bet
        created_at: u64,                  // Creation timestamp
        resolved_at: Option<u64>,         // Resolution timestamp
        winner: Option<address>,          // Winner's address
        claimed: bool,                    // Whether funds have been claimed
        treasury: Treasury,               // Token treasury for this bet
    }

    /// Initialize the module
    fun init_module(account: &signer) {
        move_to(account, BetCounter { value: 0 });
        move_to(account, EventCounter { value: 0 });
        move_to(account, EventTable { events: table::new() });
        move_to(account, EventBetTable { event_bets: table::new() });
    }

    #[test_only]
    public fun init_for_testing(account: &signer) {
        move_to(account, BetCounter { value: 0 });
        move_to(account, EventCounter { value: 0 });
        move_to(account, EventTable { events: table::new() });
        move_to(account, EventBetTable { event_bets: table::new() });
    }

    /// Get next unique bet ID
    fun get_next_bet_id(): u64 acquires BetCounter {
        let counter = borrow_global_mut<BetCounter>(@ufc_strike);
        counter.value = counter.value + 1;
        counter.value
    }

    /// Get next unique event ID
    fun get_next_event_id(): u64 acquires EventCounter {
        let counter = borrow_global_mut<EventCounter>(@ufc_strike);
        counter.value = counter.value + 1;
        counter.value
    }



    /// Create a new event
    public entry fun create_event(
        admin: &signer,
        category: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        deadline_to_join: u64,
        resolution_timeout: u64
    ) acquires EventCounter, EventTable, EventBetTable {
        // Verify that the admin is the correct account
        assert!(signer::address_of(admin) == @ufc_strike, error::permission_denied(1));
        
        let event_id = get_next_event_id();
        let current_time = timestamp::now_seconds();
        
        // Create the event
        let event = Event {
            id: event_id,
            category: string::utf8(category),
            name: string::utf8(name),
            description: string::utf8(description),
            deadline_to_join,
            resolution_timeout,
            created_at: current_time,
            resolved_at: option::none(),
            winner: option::none(),
        };
        
        // Save the event to the global table
        let event_table = borrow_global_mut<EventTable>(@ufc_strike);
        table::add(&mut event_table.events, event_id, event);
        
        // Initialize bet table for this event
        let event_bet_table = borrow_global_mut<EventBetTable>(@ufc_strike);
        table::add(&mut event_bet_table.event_bets, event_id, table::new());
    }

    /// Resolve an event (admin only) - Sets the winning result
    public entry fun resolve_event(
        admin: &signer,
        event_id: u64,
        winner_result: vector<u8>
    ) acquires EventTable {
        // Verify that the admin is the correct account
        assert!(signer::address_of(admin) == @ufc_strike, error::permission_denied(1));
        
        // Get the event
        let event_table = borrow_global_mut<EventTable>(@ufc_strike);
        let event = table::borrow_mut(&mut event_table.events, event_id);
        
        // Verify that the event exists and has not been resolved
        assert!(option::is_none(&event.resolved_at), error::invalid_state(1));
        
        // Mark the event as resolved
        event.resolved_at = option::some(timestamp::now_seconds());
        event.winner = option::some(string::utf8(winner_result));
    }



    /// Create a new bet and deposit initial tokens
    public entry fun create_bet(
        maker: &signer,
        event_id: u64,
        maker_result: vector<u8>,
        token_metadata: Object<Metadata>,
        amount: u64,
        fee_percentage: u64,
        deadline_to_accept: Option<u64>
    ) acquires BetCounter, EventBetTable {
        
        let bet_id = get_next_bet_id();
        let current_time = timestamp::now_seconds();
        
        // Create token treasury for this bet
        let ufc_ref = object::create_object(@ufc_strike);
        let extend_ref = object::generate_extend_ref(&ufc_ref);
        let treasury_store = fungible_asset::create_store(&ufc_ref, token_metadata);
         
        // Deposit initial tokens from maker
        let fa = primary_fungible_store::withdraw(maker, token_metadata, amount);
        fungible_asset::deposit(treasury_store, fa);

        // Create the treasury
        let treasury = Treasury {
            store: treasury_store,
            extend_ref,
        };

        // Create the bet with the treasury included
        let bet = Bet {
            id: bet_id,
            event_id,
            maker: signer::address_of(maker),
            maker_result: string::utf8(maker_result),
            taker: option::none(),
            taker_result: option::none(),
            token_metadata,
            amount,
            fee_percentage,
            deadline_to_accept,
            created_at: current_time,
            resolved_at: option::none(),
            winner: option::none(),
            claimed: false,
            treasury: treasury,
        };

        // Save the bet to the corresponding event table
        let event_bet_table = borrow_global_mut<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow_mut(&mut event_bet_table.event_bets, event_id);
        table::add(event_bets, bet_id, bet);
    }



    /// Take a bet (taker)
    public entry fun take_bet(
        taker: &signer,
        event_id: u64,
        bet_id: u64,
        taker_result: vector<u8>
    ) acquires EventBetTable {
        // Verify that the bet exists in the event
        assert!(bet_exists_in_event(event_id, bet_id), error::not_found(1));
        
        let event_bet_table = borrow_global_mut<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow_mut(&mut event_bet_table.event_bets, event_id);
        let bet = table::borrow_mut(event_bets, bet_id);
        
        // Verify that the bet doesn't have a taker
        assert!(option::is_none(&bet.taker), error::invalid_argument(2));
        
        // Verify that the taker is not the same as the maker
        assert!(signer::address_of(taker) != bet.maker, error::invalid_argument(3));
        
        // Check deadline if it exists
        if (option::is_some(&bet.deadline_to_accept)) {
            let deadline = *option::borrow(&bet.deadline_to_accept);
            let current_time = timestamp::now_seconds();
            assert!(current_time <= deadline, error::invalid_argument(4));
        };
        
        // Verify that the taker's result is different from the maker's
        let taker_result_str = string::utf8(taker_result);
        assert!(taker_result_str != bet.maker_result, error::invalid_argument(5));
        
        // Transfer tokens from taker to treasury
        let taker_tokens = primary_fungible_store::withdraw(taker, bet.token_metadata, bet.amount);
        fungible_asset::deposit(bet.treasury.store, taker_tokens);
        
        // Update the bet with taker information
        bet.taker = option::some(signer::address_of(taker));
        bet.taker_result = option::some(taker_result_str);
    }

    /// Resolve a bet (admin only) - Only sets the winner
    public entry fun resolve_bet(
        admin: &signer,
        event_id: u64,
        bet_id: u64,
        winner_address: address
    ) acquires EventBetTable {
        // Verify that the admin is the correct account
        assert!(signer::address_of(admin) == @ufc_strike, error::permission_denied(1));
        
        // Get the bet
        let event_bet_table = borrow_global_mut<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow_mut(&mut event_bet_table.event_bets, event_id);
        let bet = table::borrow_mut(event_bets, bet_id);
        
        // Verify that the bet exists and has not been resolved
        assert!(option::is_none(&bet.resolved_at), error::invalid_state(1));
        
        // Verify that the bet has a taker
        assert!(option::is_some(&bet.taker), error::invalid_state(2));
        
        // Verify that the winner is one of the participants
        let taker_addr = *option::borrow(&bet.taker);
        assert!(
            winner_address == bet.maker || winner_address == taker_addr,
            error::invalid_argument(1)
        );
        
        // Mark the bet as resolved
        bet.resolved_at = option::some(timestamp::now_seconds());
        bet.winner = option::some(winner_address);
    }

    /// Claim winnings from a resolved bet (winner only)
    public entry fun claim_winnings(
        winner: &signer,
        event_id: u64,
        bet_id: u64
    ) acquires EventBetTable {
        // Get the bet
        let event_bet_table = borrow_global_mut<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow_mut(&mut event_bet_table.event_bets, event_id);
        let bet = table::borrow_mut(event_bets, bet_id);
        
        // Verify that the bet is resolved
        assert!(option::is_some(&bet.resolved_at), error::invalid_state(1));
        
        // Verify that funds have not been claimed
        assert!(!bet.claimed, error::invalid_state(2));
        
        // Verify that the signer is the winner
        let winner_addr = *option::borrow(&bet.winner);
        assert!(signer::address_of(winner) == winner_addr, error::permission_denied(1));
        
        // Calculate winnings
        let total_pot = bet.amount * 2; // Maker + Taker
        let fee_amount = (total_pot * bet.fee_percentage) / 10000; // fee_percentage is in basis points
        let winner_amount = total_pot - fee_amount;
        
        // Transfer winnings to winner
        let signer_ref = object::generate_signer_for_extending(&bet.treasury.extend_ref);
        let winner_tokens = fungible_asset::withdraw(&signer_ref, bet.treasury.store, winner_amount);
        primary_fungible_store::deposit(winner_addr, winner_tokens);
        
        // Transfer fees to admin
        let fee_tokens = fungible_asset::withdraw(&signer_ref, bet.treasury.store, fee_amount);
        primary_fungible_store::deposit(@ufc_strike, fee_tokens);
        
        // Mark as claimed
        bet.claimed = true;
    }






    #[view]
    public fun bet_exists_in_event(event_id: u64, bet_id: u64): bool acquires EventBetTable {
        let event_bet_table = borrow_global<EventBetTable>(@ufc_strike);
        if (table::contains(&event_bet_table.event_bets, event_id)) {
            let event_bets = table::borrow(&event_bet_table.event_bets, event_id);
            table::contains(event_bets, bet_id)
        } else {
            false
        }
    }


    public struct BetInfo has drop, store {
        id: u64,
        event_id: u64,
        maker: address,
        maker_result: String,
        amount: u64,
        taker: address,
        taker_result: String,
        winner: address,
        claimed: bool,
    }

    #[view]
    public fun get_bet_info(event_id: u64, bet_id: u64): BetInfo acquires EventBetTable {
        let event_bet_table = borrow_global<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow(&event_bet_table.event_bets, event_id);
        let bet = table::borrow(event_bets, bet_id);
        
        let taker_addr = if (option::is_some(&bet.taker)) {
            *option::borrow(&bet.taker)
        } else {
            @0x0
        };
        
        let taker_result = if (option::is_some(&bet.taker_result)) {
            *option::borrow(&bet.taker_result)
        } else {
            string::utf8(b"No taker yet")
        };
        
        let winner_addr = if (option::is_some(&bet.winner)) {
            *option::borrow(&bet.winner)
        } else {
            @0x0
        };
        
        BetInfo {
            id: bet.id,
            event_id: bet.event_id,
            maker: bet.maker,
            maker_result: bet.maker_result,
            amount: bet.amount,
            taker: taker_addr,
            taker_result: taker_result,
            winner: winner_addr,
            claimed: bet.claimed,
        }
    }

    #[view]
    public fun get_bet_balance(event_id: u64, bet_id: u64): u64 acquires EventBetTable {
        let event_bet_table = borrow_global<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow(&event_bet_table.event_bets, event_id);
        let bet = table::borrow(event_bets, bet_id);
        fungible_asset::balance(bet.treasury.store)
    }

    #[view]
    public fun get_bet_winner(event_id: u64, bet_id: u64): address acquires EventBetTable {
        let event_bet_table = borrow_global<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow(&event_bet_table.event_bets, event_id);
        let bet = table::borrow(event_bets, bet_id);
        if (option::is_some(&bet.winner)) {
            *option::borrow(&bet.winner)
        } else {
            @0x0
        }
    }

    #[view]
    public fun get_bet_claimed(event_id: u64, bet_id: u64): bool acquires EventBetTable {
        let event_bet_table = borrow_global<EventBetTable>(@ufc_strike);
        let event_bets = table::borrow(&event_bet_table.event_bets, event_id);
        let bet = table::borrow(event_bets, bet_id);
        bet.claimed
    }

    #[view]
    public fun event_exists(event_id: u64): bool acquires EventTable {
        let event_table = borrow_global<EventTable>(@ufc_strike);
        table::contains(&event_table.events, event_id)
    }

    public struct EventInfo has drop, store {
        id: u64,
        category: String,
        name: String,
        description: String,
        deadline_to_join: u64,
        resolution_timeout: u64,
        created_at: u64,
        resolved_at: u64,
        winner: String,
    }

    #[view]
    public fun get_event_info(event_id: u64): EventInfo acquires EventTable {
        let event_table = borrow_global<EventTable>(@ufc_strike);
        let event = table::borrow(&event_table.events, event_id);
        
        let resolved_at = if (option::is_some(&event.resolved_at)) {
            *option::borrow(&event.resolved_at)
        } else {
            0
        };
        
        let winner = if (option::is_some(&event.winner)) {
            *option::borrow(&event.winner)
        } else {
            string::utf8(b"Not resolved yet")
        };
        
        EventInfo {
            id: event.id,
            category: event.category,
            name: event.name,
            description: event.description,
            deadline_to_join: event.deadline_to_join,
            resolution_timeout: event.resolution_timeout,
            created_at: event.created_at,
            resolved_at,
            winner,
        }
    }

    #[view]
    public fun get_event_winner(event_id: u64): String acquires EventTable {
        let event_table = borrow_global<EventTable>(@ufc_strike);
        let event = table::borrow(&event_table.events, event_id);
        if (option::is_some(&event.winner)) {
            *option::borrow(&event.winner)
        } else {
            string::utf8(b"Not resolved yet")
        }
    }

    #[view]
    public fun is_event_resolved(event_id: u64): bool acquires EventTable {
        let event_table = borrow_global<EventTable>(@ufc_strike);
        let event = table::borrow(&event_table.events, event_id);
        option::is_some(&event.resolved_at)
    }

    #[view]
    public fun event_has_bet_table(event_id: u64): bool acquires EventBetTable {
        let event_bet_table = borrow_global<EventBetTable>(@ufc_strike);
        table::contains(&event_bet_table.event_bets, event_id)
    }
}
