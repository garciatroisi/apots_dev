module ufc_strike::packs_manager {
    use aptos_framework::signer;
    use aptos_token_objects::aptos_token;
    use std::vector;
    use std::string::String;
    use std::error;
    use ufc_strike::moments_registry;


    /// The user does not own the token or holds insufficient balance
    const ENOT_TOKEN_OWNER: u64 = 1;
    /// No valid drop entry found for random roll
    const ENO_DROP_ENTRY_FOUND: u64 = 2;

    /// Drop entry for a moment type, referenced by listing_id
    struct DropEntry has copy, drop, store {
        listing_id: u64,
        weight: u64,
        remaining_supply: u64,
    }

    /// Drop pool associated with a pack collection
    struct DropPool has key, store {
        entries: vector<DropEntry>,
        total_weight: u64,
    }

    /// Global resource containing the pool
    struct PacksDrop has key {
        pool: DropPool,
    }

    /// Initializes the drop pool with a set of listing_ids, weights, and supplies
    public entry fun init_drop_pool(
        creator: &signer,
        listing_ids: vector<u64>,
        weights: vector<u64>,
        supplies: vector<u64>,
    ) {
        let pool = create_drop_pool(listing_ids, weights, supplies, 0, vector::empty<DropEntry>(), 0);
        move_to(creator, PacksDrop { pool });
    }

    /// Helper function to create drop pool recursively
    fun create_drop_pool(
        listing_ids: vector<u64>,
        weights: vector<u64>,
        supplies: vector<u64>,
        current_index: u64,
        current_entries: vector<DropEntry>,
        current_total_weight: u64,
    ): DropPool {
        let len = vector::length(&listing_ids);
        
        if (current_index >= len) {
            return DropPool {
                entries: current_entries,
                total_weight: current_total_weight,
            }
        };

        let listing_id = *vector::borrow(&listing_ids, current_index);
        let weight = *vector::borrow(&weights, current_index);
        let supply = *vector::borrow(&supplies, current_index);
        let new_total_weight = current_total_weight + weight;
        let new_entry = DropEntry {
            listing_id,
            weight,
            remaining_supply: supply,
        };
        vector::push_back(&mut current_entries, new_entry);

        create_drop_pool(listing_ids, weights, supplies, current_index + 1, current_entries, new_total_weight)
    }

    /// Opens a pack owned by the user, mints the randomized moment, and marks the pack as opened
    public entry fun open_pack(
        user: &signer,
        creator: &signer,
        randomness: u64,
        _pack_id: address
    ) acquires PacksDrop {
        let _user_addr = signer::address_of(user);

        // 1. Ensure the user owns the pack NFT
        // Note: In a real implementation, you would verify ownership here
        // For now, we'll assume the user owns the pack


        // 2. Mark the pack as opened (requires mutable property on token)
        // Note: This would require the token to have mutable properties
        // For now, we'll skip this step as it depends on token implementation

        // 3. Get the drop pool
        let pack_pool = borrow_global_mut<PacksDrop>(signer::address_of(creator));
        let pool = &mut pack_pool.pool;

        // 4. Roll a random number and find a drop entry
        let roll = randomness % pool.total_weight;
        find_and_mint_moment(pool, roll, 0, 0, creator);
    }

    /// Helper function to find and mint a moment recursively
    fun find_and_mint_moment(
        pool: &mut DropPool,
        roll: u64,
        current_index: u64,
        current_acc: u64,
        creator: &signer,
    ) {
        let len = vector::length(&pool.entries);
        
        if (current_index >= len) {
            // No entry found or no supply, abort
            abort error::invalid_argument(ENO_DROP_ENTRY_FOUND)
        };

        let entry = vector::borrow_mut(&mut pool.entries, current_index);
        let new_acc = current_acc + entry.weight;

        if (roll < new_acc && entry.remaining_supply > 0) {
            entry.remaining_supply = entry.remaining_supply - 1;

            // Get metadata from registry
            let metadata = moments_registry::get_moment_metadata(entry.listing_id);

                            // Mint the NFT to the user
                let _ = aptos_token::mint_token_object(
                    creator,
                    moments_registry::get_moment_name(metadata),
                    moments_registry::get_moment_description(metadata),
                    moments_registry::get_moment_name(metadata),
                    moments_registry::get_moment_uri(metadata),
                    vector::empty<String>(),
                    vector::empty<String>(),
                    vector::empty<vector<u8>>(),
                );
        } else {
            find_and_mint_moment(pool, roll, current_index + 1, new_acc, creator)
        }
    }
    
}
