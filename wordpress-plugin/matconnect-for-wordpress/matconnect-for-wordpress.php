<?php
/**
 * Plugin Name: MatConnect for WordPress
 * Plugin URI:  https://matconnect.app
 * Description: Display live MatConnect data on your WordPress site — class schedule, pricing, lead form, testimonials, and FAQ. Requires a MatConnect account and API key.
 * Version:     1.0.0
 * Author:      MatConnect
 * Author URI:  https://matconnect.app
 * License:     GPL-2.0-or-later
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: matconnect
 */

defined( 'ABSPATH' ) || exit;

define( 'MATCONNECT_VERSION', '1.0.0' );
define( 'MATCONNECT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MATCONNECT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once MATCONNECT_PLUGIN_DIR . 'includes/class-settings.php';
require_once MATCONNECT_PLUGIN_DIR . 'includes/class-api-client.php';
require_once MATCONNECT_PLUGIN_DIR . 'includes/class-blocks.php';
require_once MATCONNECT_PLUGIN_DIR . 'includes/shortcodes.php';
require_once MATCONNECT_PLUGIN_DIR . 'admin/settings-page.php';

// Warn admins if plugin isn't configured
add_action( 'admin_notices', function () {
    if ( ! current_user_can( 'manage_options' ) ) return;
    $settings = MatConnect_Settings::get();
    if ( empty( $settings['url'] ) || empty( $settings['api_key'] ) ) {
        $url = admin_url( 'options-general.php?page=matconnect' );
        echo '<div class="notice notice-warning"><p>'
           . sprintf(
               /* translators: %s: settings page link */
               __( '<strong>MatConnect:</strong> Please <a href="%s">configure your MatConnect URL and API key</a> to enable blocks and shortcodes.', 'matconnect' ),
               esc_url( $url )
           )
           . '</p></div>';
    }
} );
