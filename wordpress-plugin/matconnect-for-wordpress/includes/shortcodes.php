<?php
defined( 'ABSPATH' ) || exit;

add_shortcode( 'matconnect_schedule', function ( $atts ) {
    $atts = shortcode_atts( [ 'days_ahead' => 7 ], $atts, 'matconnect_schedule' );
    return matconnect_render_schedule( [ 'daysAhead' => intval( $atts['days_ahead'] ) ] );
} );

add_shortcode( 'matconnect_pricing', function ( $atts ) {
    $atts = shortcode_atts( [ 'show_cta' => 'true', 'cta_label' => 'Get started' ], $atts, 'matconnect_pricing' );
    return matconnect_render_pricing( [
        'showCta'  => $atts['show_cta'] !== 'false',
        'ctaLabel' => $atts['cta_label'],
    ] );
} );

add_shortcode( 'matconnect_lead_form', function ( $atts ) {
    $atts = shortcode_atts( [ 'success_message' => '' ], $atts, 'matconnect_lead_form' );
    return matconnect_render_lead_form( [ 'successMessage' => $atts['success_message'] ] );
} );

add_shortcode( 'matconnect_testimonials', function ( $atts ) {
    $atts = shortcode_atts( [ 'max' => 0 ], $atts, 'matconnect_testimonials' );
    return matconnect_render_testimonials( [ 'maxItems' => intval( $atts['max'] ) ] );
} );

add_shortcode( 'matconnect_faq', function () {
    return matconnect_render_faq( [] );
} );
