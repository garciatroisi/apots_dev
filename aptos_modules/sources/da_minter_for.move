module ufc_strike::issuer {
    use aptos_token_objects::aptos_token;
    use std::string;
    use std::vector;
    use aptos_framework::object;

    /// Mints multiple tokens and transfers them to their respective recipients
    /// 
    /// # Arguments
    /// * `account` - The signer account that will mint the tokens
    /// * `token_names` - Vector of token names
    /// * `token_descriptions` - Vector of token descriptions
    /// * `token_uris` - Vector of token URIs
    /// * `recipients` - Vector of recipient addresses
    public entry fun mint_for(
        account: &signer,
        token_names: vector<string::String>,
        token_descriptions: vector<string::String>,
        token_uris: vector<string::String>,
        recipients: vector<address>
    ) {
        let property_keys = vector::empty<string::String>();
        let property_types = vector::empty<string::String>();
        let property_values = vector::empty<vector<u8>>();

        // Mint and transfer tokens
        let i = 0;
        let len = vector::length(&token_names);
        while (i < len) {
            let token_name = vector::borrow(&token_names, i);
            let token_description = vector::borrow(&token_descriptions, i);
            let token_uri = vector::borrow(&token_uris, i);
            let recipient = vector::borrow(&recipients, i);

            let token_id = aptos_token::mint_token_object(
                account,
                *token_name,
                *token_description,
                *token_name,
                *token_uri,
                property_keys,
                property_types,
                property_values,
            );
            object::transfer(account, token_id, *recipient);
            i = i + 1;
        }
    }
} 