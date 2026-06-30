<?php
defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', function () {
    add_options_page(
        __( 'MatConnect', 'matconnect' ),
        __( 'MatConnect', 'matconnect' ),
        'manage_options',
        'matconnect',
        'matconnect_render_settings_page'
    );
} );

add_action( 'admin_init', function () {
    register_setting( 'matconnect', 'matconnect_settings', [ 'sanitize_callback' => 'matconnect_sanitize_settings' ] );
} );

function matconnect_sanitize_settings( $input ): array {
    $clean = [];
    $clean['url']          = esc_url_raw( trim( $input['url'] ?? '' ) );
    $clean['api_key']      = sanitize_text_field( $input['api_key'] ?? '' );
    $clean['accent_color'] = sanitize_hex_color( $input['accent_color'] ?? '' ) ?: '#2563eb';
    $clean['schedule_ttl'] = max( 60, intval( $input['schedule_ttl'] ?? 300 ) );
    $clean['data_ttl']     = max( 60, intval( $input['data_ttl'] ?? 3600 ) );
    return $clean;
}

// Handle "Test Connection" and "Clear Cache" actions
add_action( 'admin_post_matconnect_test', function () {
    check_admin_referer( 'matconnect_test' );
    $client = MatConnect_API_Client::from_settings();
    $result = $client->get( '/api/v1/gym', 'test_gym', 5 );
    $status = is_wp_error( $result ) ? 'error' : 'ok';
    $name   = is_wp_error( $result ) ? urlencode( $result->get_error_message() ) : urlencode( $result['gymName'] ?? '' );
    wp_safe_redirect( admin_url( "options-general.php?page=matconnect&mc_test=$status&mc_gym=$name" ) );
    exit;
} );

add_action( 'admin_post_matconnect_clear_cache', function () {
    check_admin_referer( 'matconnect_clear_cache' );
    MatConnect_Settings::clear_cache();
    wp_safe_redirect( admin_url( 'options-general.php?page=matconnect&mc_cache_cleared=1' ) );
    exit;
} );

function matconnect_render_settings_page(): void {
    $settings = MatConnect_Settings::get();
    $test     = sanitize_text_field( $_GET['mc_test']          ?? '' );
    $gym_name = sanitize_text_field( urldecode( $_GET['mc_gym'] ?? '' ) );
    $cleared  = ! empty( $_GET['mc_cache_cleared'] );
    ?>
    <div class="wrap">
        <h1><?php esc_html_e( 'MatConnect Settings', 'matconnect' ); ?></h1>

        <?php if ( $test === 'ok' ) : ?>
            <div class="notice notice-success is-dismissible"><p>
                <?php printf( esc_html__( 'Connection successful! Connected to: %s', 'matconnect' ), '<strong>' . esc_html( $gym_name ) . '</strong>' ); ?>
            </p></div>
        <?php elseif ( $test === 'error' ) : ?>
            <div class="notice notice-error is-dismissible"><p>
                <?php printf( esc_html__( 'Connection failed: %s', 'matconnect' ), esc_html( $gym_name ) ); ?>
            </p></div>
        <?php endif; ?>

        <?php if ( $cleared ) : ?>
            <div class="notice notice-success is-dismissible"><p>
                <?php esc_html_e( 'MatConnect cache cleared.', 'matconnect' ); ?>
            </p></div>
        <?php endif; ?>

        <form method="post" action="options.php">
            <?php settings_fields( 'matconnect' ); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="mc_url"><?php esc_html_e( 'MatConnect URL', 'matconnect' ); ?></label></th>
                    <td>
                        <input id="mc_url" name="matconnect_settings[url]" type="url"
                               class="regular-text" value="<?php echo esc_attr( $settings['url'] ); ?>"
                               placeholder="https://yoursite.matconnect.app" />
                        <p class="description"><?php esc_html_e( 'The base URL of your MatConnect instance.', 'matconnect' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="mc_api_key"><?php esc_html_e( 'API Key', 'matconnect' ); ?></label></th>
                    <td>
                        <input id="mc_api_key" name="matconnect_settings[api_key]" type="password"
                               class="regular-text" value="<?php echo esc_attr( $settings['api_key'] ); ?>"
                               autocomplete="off" />
                        <p class="description"><?php esc_html_e( 'Generate an API key in MatConnect → Settings → Integrations.', 'matconnect' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="mc_color"><?php esc_html_e( 'Accent Color', 'matconnect' ); ?></label></th>
                    <td>
                        <input id="mc_color" name="matconnect_settings[accent_color]" type="color"
                               value="<?php echo esc_attr( $settings['accent_color'] ); ?>" />
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php esc_html_e( 'Cache Duration', 'matconnect' ); ?></th>
                    <td>
                        <label>
                            <?php esc_html_e( 'Schedule:', 'matconnect' ); ?>
                            <input name="matconnect_settings[schedule_ttl]" type="number" min="60"
                                   class="small-text" value="<?php echo esc_attr( $settings['schedule_ttl'] ); ?>" />
                            <?php esc_html_e( 'seconds', 'matconnect' ); ?>
                        </label>
                        <br />
                        <label>
                            <?php esc_html_e( 'Pricing / FAQ / Testimonials:', 'matconnect' ); ?>
                            <input name="matconnect_settings[data_ttl]" type="number" min="60"
                                   class="small-text" value="<?php echo esc_attr( $settings['data_ttl'] ); ?>" />
                            <?php esc_html_e( 'seconds', 'matconnect' ); ?>
                        </label>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <hr />
        <h2><?php esc_html_e( 'Tools', 'matconnect' ); ?></h2>
        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline-block;margin-right:12px;">
            <?php wp_nonce_field( 'matconnect_test' ); ?>
            <input type="hidden" name="action" value="matconnect_test" />
            <button type="submit" class="button"><?php esc_html_e( 'Test Connection', 'matconnect' ); ?></button>
        </form>
        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline-block;">
            <?php wp_nonce_field( 'matconnect_clear_cache' ); ?>
            <input type="hidden" name="action" value="matconnect_clear_cache" />
            <button type="submit" class="button"><?php esc_html_e( 'Clear Cache', 'matconnect' ); ?></button>
        </form>
    </div>
    <?php
}
