<?php
defined( 'ABSPATH' ) || exit;

class MatConnect_API_Client {

    private string $base_url;
    private string $api_key;

    public function __construct( string $base_url, string $api_key ) {
        $this->base_url = untrailingslashit( $base_url );
        $this->api_key  = $api_key;
    }

    /**
     * GET with transient caching. Returns decoded array or WP_Error.
     */
    public function get( string $endpoint, string $cache_key, int $ttl ) {
        $cached = get_transient( 'matconnect_' . $cache_key );
        if ( $cached !== false ) {
            return $cached;
        }

        $response = wp_remote_get(
            $this->base_url . $endpoint,
            [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->api_key,
                    'Accept'        => 'application/json',
                ],
                'timeout' => 10,
            ]
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        if ( $code !== 200 ) {
            return new WP_Error( 'matconnect_api_error', "MatConnect API returned HTTP $code for $endpoint" );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( $body === null ) {
            return new WP_Error( 'matconnect_parse_error', 'Could not parse MatConnect API response' );
        }

        set_transient( 'matconnect_' . $cache_key, $body, $ttl );
        return $body;
    }

    /**
     * POST without caching. Returns decoded array or WP_Error.
     */
    public function post( string $endpoint, array $body ) {
        $response = wp_remote_post(
            $this->base_url . $endpoint,
            [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->api_key,
                    'Content-Type'  => 'application/json',
                    'Accept'        => 'application/json',
                ],
                'body'    => wp_json_encode( $body ),
                'timeout' => 10,
            ]
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code >= 400 ) {
            $msg = $data['error'] ?? "HTTP $code";
            return new WP_Error( 'matconnect_api_error', $msg );
        }

        return $data;
    }

    public static function from_settings(): self {
        $s = MatConnect_Settings::get();
        return new self( $s['url'], $s['api_key'] );
    }
}
