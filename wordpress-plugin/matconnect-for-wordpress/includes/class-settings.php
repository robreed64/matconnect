<?php
defined( 'ABSPATH' ) || exit;

class MatConnect_Settings {

    const OPTION_KEY = 'matconnect_settings';

    public static function get(): array {
        $defaults = [
            'url'          => '',
            'api_key'      => '',
            'accent_color' => '#2563eb',
            'schedule_ttl' => 300,
            'data_ttl'     => 3600,
        ];
        return wp_parse_args( get_option( self::OPTION_KEY, [] ), $defaults );
    }

    public static function save( array $data ): void {
        $current = self::get();
        $updated = array_merge( $current, array_intersect_key( $data, $current ) );
        $updated['url']          = esc_url_raw( trim( $updated['url'] ) );
        $updated['accent_color'] = sanitize_hex_color( $updated['accent_color'] ) ?: '#2563eb';
        $updated['schedule_ttl'] = max( 60, intval( $updated['schedule_ttl'] ) );
        $updated['data_ttl']     = max( 60, intval( $updated['data_ttl'] ) );
        update_option( self::OPTION_KEY, $updated );
    }

    public static function clear_cache(): void {
        global $wpdb;
        $wpdb->query(
            "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_matconnect_%' OR option_name LIKE '_transient_timeout_matconnect_%'"
        );
    }
}
