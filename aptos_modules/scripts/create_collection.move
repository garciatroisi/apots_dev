script {
    use aptos_token_objects::aptos_token;
    use std::string; 

    fun main(account: &signer) {
        let collection_name = string::utf8(b"UFCPACKS");
        let description = string::utf8(b"My NFT Collection");
        aptos_token::create_collection(
            account,
            description,
            1000000, 
            collection_name,
            string::utf8(b"https://example.com/collection_metadata.json"),
            true, true, true, true, true, true, true, false, false,
            5, 100 
        );
    }
}
