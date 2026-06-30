<?php
defined( 'ABSPATH' ) || exit;

// ─── Register all blocks server-side ────────────────────────────────────────

add_action( 'init', function () {
    register_block_type( 'matconnect/schedule', [
        'render_callback' => 'matconnect_render_schedule',
        'attributes'      => [
            'daysAhead' => [ 'type' => 'integer', 'default' => 7 ],
        ],
    ] );

    register_block_type( 'matconnect/pricing', [
        'render_callback' => 'matconnect_render_pricing',
        'attributes'      => [
            'showCta'  => [ 'type' => 'boolean', 'default' => true ],
            'ctaLabel' => [ 'type' => 'string',  'default' => 'Get started' ],
        ],
    ] );

    register_block_type( 'matconnect/lead-form', [
        'render_callback' => 'matconnect_render_lead_form',
        'attributes'      => [
            'successMessage' => [ 'type' => 'string', 'default' => '' ],
        ],
    ] );

    register_block_type( 'matconnect/testimonials', [
        'render_callback' => 'matconnect_render_testimonials',
        'attributes'      => [
            'maxItems' => [ 'type' => 'integer', 'default' => 0 ],
        ],
    ] );

    register_block_type( 'matconnect/faq', [
        'render_callback' => 'matconnect_render_faq',
        'attributes'      => [],
    ] );
} );

// ─── Enqueue editor JS (registers blocks in Gutenberg inserter) ──────────────

add_action( 'enqueue_block_editor_assets', function () {
    wp_enqueue_script(
        'matconnect-blocks-editor',
        MATCONNECT_PLUGIN_URL . 'assets/js/editor.js',
        [ 'wp-blocks', 'wp-element' ],
        MATCONNECT_VERSION,
        true
    );
} );

// ─── Enqueue shared front-end stylesheet ────────────────────────────────────

add_action( 'wp_enqueue_scripts', function () {
    wp_register_style(
        'matconnect-blocks',
        MATCONNECT_PLUGIN_URL . 'assets/css/matconnect.css',
        [],
        MATCONNECT_VERSION
    );
} );

// ─── Lead form JS ───────────────────────────────────────────────────────────

add_action( 'wp_enqueue_scripts', function () {
    $settings = MatConnect_Settings::get();
    wp_register_script(
        'matconnect-lead-form',
        MATCONNECT_PLUGIN_URL . 'assets/js/lead-form.js',
        [],
        MATCONNECT_VERSION,
        true
    );
    wp_localize_script( 'matconnect-lead-form', 'matconnectLeadForm', [
        'endpoint' => untrailingslashit( $settings['url'] ) . '/api/v1/leads',
        'color'    => $settings['accent_color'],
    ] );
} );

// ─── FAQ accordion JS ───────────────────────────────────────────────────────

add_action( 'wp_enqueue_scripts', function () {
    wp_register_script(
        'matconnect-faq',
        MATCONNECT_PLUGIN_URL . 'assets/js/faq.js',
        [],
        MATCONNECT_VERSION,
        true
    );
} );

// ─── Render callbacks ────────────────────────────────────────────────────────

function matconnect_render_schedule( array $attrs ): string {
    $settings   = MatConnect_Settings::get();
    if ( empty( $settings['url'] ) || empty( $settings['api_key'] ) ) {
        return matconnect_not_configured();
    }

    $days_ahead = intval( $attrs['daysAhead'] ?? 7 );
    $client     = MatConnect_API_Client::from_settings();
    $data       = $client->get( '/api/v1/schedule?days=' . $days_ahead, 'schedule_' . $days_ahead, $settings['schedule_ttl'] );

    if ( is_wp_error( $data ) ) {
        return '<p class="matconnect-error">' . esc_html__( 'Schedule temporarily unavailable.', 'matconnect' ) . '</p>';
    }

    $color = esc_attr( $settings['accent_color'] );
    ob_start();
    wp_enqueue_style( 'matconnect-blocks' );
    ?>
    <div class="matconnect-schedule">
        <?php if ( empty( $data['days'] ) ) : ?>
            <p class="matconnect-empty"><?php esc_html_e( 'No classes scheduled in the next few days.', 'matconnect' ); ?></p>
        <?php else : ?>
            <?php foreach ( $data['days'] as $day ) : ?>
                <div class="mc-day">
                    <h3 class="mc-day-label" style="color:<?php echo $color; ?>"><?php echo esc_html( $day['label'] ); ?></h3>
                    <ul class="mc-class-list">
                        <?php foreach ( $day['classes'] as $class ) : ?>
                            <li class="mc-class" style="border-left-color:<?php echo $color; ?>">
                                <span class="mc-class-name"><?php echo esc_html( $class['name'] ); ?></span>
                                <span class="mc-class-time"><?php echo esc_html( $class['startTime'] ); ?><?php echo $class['endTime'] ? ' – ' . esc_html( $class['endTime'] ) : ''; ?></span>
                                <?php if ( $class['instructor'] ) : ?>
                                    <span class="mc-class-instructor"><?php echo esc_html( $class['instructor'] ); ?></span>
                                <?php endif; ?>
                                <?php if ( $class['spotsAvailable'] !== null ) : ?>
                                    <span class="mc-class-spots"><?php printf( esc_html__( '%d spots', 'matconnect' ), $class['spotsAvailable'] ); ?></span>
                                <?php endif; ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}

function matconnect_render_pricing( array $attrs ): string {
    $settings = MatConnect_Settings::get();
    if ( empty( $settings['url'] ) || empty( $settings['api_key'] ) ) {
        return matconnect_not_configured();
    }

    $client   = MatConnect_API_Client::from_settings();
    $data     = $client->get( '/api/v1/plans', 'plans', $settings['data_ttl'] );
    $show_cta = ! empty( $attrs['showCta'] );
    $cta      = esc_html( $attrs['ctaLabel'] ?? __( 'Get started', 'matconnect' ) );
    $enroll   = untrailingslashit( $settings['url'] ) . '/enroll';
    $color    = esc_attr( $settings['accent_color'] );

    if ( is_wp_error( $data ) ) {
        return '<p class="matconnect-error">' . esc_html__( 'Pricing temporarily unavailable.', 'matconnect' ) . '</p>';
    }

    ob_start();
    wp_enqueue_style( 'matconnect-blocks' );
    ?>
    <div class="matconnect-pricing">
        <?php foreach ( $data['plans'] as $plan ) : ?>
            <div class="mc-plan">
                <h3 class="mc-plan-name"><?php echo esc_html( $plan['name'] ); ?></h3>
                <div class="mc-plan-price" style="color:<?php echo $color; ?>">
                    <?php echo esc_html( $plan['symbol'] . number_format( $plan['price'], 2 ) ); ?>
                    <span class="mc-plan-interval">/ <?php echo esc_html( $plan['interval'] ); ?></span>
                </div>
                <?php if ( $plan['description'] ) : ?>
                    <p class="mc-plan-desc"><?php echo esc_html( $plan['description'] ); ?></p>
                <?php endif; ?>
                <?php if ( $show_cta ) : ?>
                    <a href="<?php echo esc_url( $enroll ); ?>" class="mc-plan-cta" target="_blank"
                       style="background-color:<?php echo $color; ?>"><?php echo $cta; ?></a>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}

function matconnect_render_lead_form( array $attrs ): string {
    $settings = MatConnect_Settings::get();
    if ( empty( $settings['url'] ) || empty( $settings['api_key'] ) ) {
        return matconnect_not_configured();
    }

    $success = esc_html( $attrs['successMessage'] ?? __( "Thanks! We'll be in touch soon.", 'matconnect' ) );
    $color   = esc_attr( $settings['accent_color'] );

    wp_enqueue_style( 'matconnect-blocks' );
    wp_enqueue_script( 'matconnect-lead-form' );

    ob_start();
    ?>
    <div class="matconnect-lead-form" data-success="<?php echo esc_attr( $success ); ?>">
        <form class="mc-form">
            <div class="mc-field">
                <label><?php esc_html_e( 'Name', 'matconnect' ); ?> <span aria-hidden="true">*</span></label>
                <input type="text" name="name" required />
            </div>
            <div class="mc-field">
                <label><?php esc_html_e( 'Email', 'matconnect' ); ?> <span aria-hidden="true">*</span></label>
                <input type="email" name="email" required />
            </div>
            <div class="mc-field">
                <label><?php esc_html_e( 'Phone', 'matconnect' ); ?></label>
                <input type="tel" name="phone" />
            </div>
            <div class="mc-field">
                <label><?php esc_html_e( 'Interest', 'matconnect' ); ?></label>
                <select name="interest">
                    <option value=""><?php esc_html_e( 'Select…', 'matconnect' ); ?></option>
                    <option value="adult-gi"><?php esc_html_e( 'Adults — Gi', 'matconnect' ); ?></option>
                    <option value="adult-nogi"><?php esc_html_e( 'Adults — No-Gi', 'matconnect' ); ?></option>
                    <option value="kids"><?php esc_html_e( 'Kids', 'matconnect' ); ?></option>
                </select>
            </div>
            <button type="submit" style="background-color:<?php echo $color; ?>"><?php esc_html_e( 'Send', 'matconnect' ); ?></button>
            <p class="mc-form-error" hidden></p>
        </form>
        <div class="mc-form-success" hidden><?php echo $success; ?></div>
    </div>
    <?php
    return ob_get_clean();
}

function matconnect_render_testimonials( array $attrs ): string {
    $settings = MatConnect_Settings::get();
    if ( empty( $settings['url'] ) || empty( $settings['api_key'] ) ) {
        return matconnect_not_configured();
    }

    $client   = MatConnect_API_Client::from_settings();
    $data     = $client->get( '/api/v1/testimonials', 'testimonials', $settings['data_ttl'] );
    $max      = intval( $attrs['maxItems'] ?? 0 );

    if ( is_wp_error( $data ) ) {
        return '<p class="matconnect-error">' . esc_html__( 'Testimonials temporarily unavailable.', 'matconnect' ) . '</p>';
    }

    $items = $data['testimonials'] ?? [];
    if ( $max > 0 ) $items = array_slice( $items, 0, $max );
    if ( empty( $items ) ) return '';

    ob_start();
    wp_enqueue_style( 'matconnect-blocks' );
    ?>
    <div class="matconnect-testimonials">
        <?php foreach ( $items as $t ) : ?>
            <div class="mc-testimonial">
                <blockquote class="mc-testimonial-text"><?php echo esc_html( $t['text'] ); ?></blockquote>
                <footer class="mc-testimonial-author">
                    <strong><?php echo esc_html( $t['name'] ); ?></strong>
                    <?php if ( $t['belt'] ) : ?>
                        <span class="mc-belt"><?php echo esc_html( ucfirst( $t['belt'] ) . ' Belt' ); ?></span>
                    <?php endif; ?>
                </footer>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}

function matconnect_render_faq( array $attrs ): string {
    $settings = MatConnect_Settings::get();
    if ( empty( $settings['url'] ) || empty( $settings['api_key'] ) ) {
        return matconnect_not_configured();
    }

    $client = MatConnect_API_Client::from_settings();
    $data   = $client->get( '/api/v1/faq', 'faq', $settings['data_ttl'] );

    if ( is_wp_error( $data ) ) {
        return '<p class="matconnect-error">' . esc_html__( 'FAQ temporarily unavailable.', 'matconnect' ) . '</p>';
    }

    $items = $data['faq'] ?? [];
    if ( empty( $items ) ) return '';

    wp_enqueue_style( 'matconnect-blocks' );
    wp_enqueue_script( 'matconnect-faq' );

    ob_start();
    ?>
    <div class="matconnect-faq">
        <?php foreach ( $items as $item ) : ?>
            <div class="mc-faq-item">
                <button class="mc-faq-question" aria-expanded="false">
                    <?php echo esc_html( $item['question'] ); ?>
                    <span class="mc-faq-icon" aria-hidden="true">+</span>
                </button>
                <div class="mc-faq-answer" hidden><?php echo wp_kses_post( $item['answer'] ); ?></div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}

function matconnect_not_configured(): string {
    if ( current_user_can( 'manage_options' ) ) {
        return '<p class="matconnect-error">' .
            sprintf(
                esc_html__( 'MatConnect: Please configure your URL and API key in %s.', 'matconnect' ),
                '<a href="' . esc_url( admin_url( 'options-general.php?page=matconnect' ) ) . '">Settings → MatConnect</a>'
            ) . '</p>';
    }
    return '';
}
