document.addEventListener( 'DOMContentLoaded', function () {
    document.querySelectorAll( '.matconnect-lead-form' ).forEach( function ( container ) {
        var form    = container.querySelector( '.mc-form' );
        var success = container.querySelector( '.mc-form-success' );
        var errEl   = container.querySelector( '.mc-form-error' );

        if ( ! form ) return;

        form.addEventListener( 'submit', function ( e ) {
            e.preventDefault();
            errEl.hidden = true;

            var data = {
                name:     form.querySelector( '[name="name"]' ).value.trim(),
                email:    form.querySelector( '[name="email"]' ).value.trim(),
                phone:    ( form.querySelector( '[name="phone"]' ) || {} ).value || '',
                interest: ( form.querySelector( '[name="interest"]' ) || {} ).value || '',
            };

            var btn = form.querySelector( 'button[type="submit"]' );
            btn.disabled = true;

            fetch( matconnectLeadForm.endpoint, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify( data ),
            } )
            .then( function ( res ) {
                if ( ! res.ok ) throw new Error( 'Server error' );
                return res.json();
            } )
            .then( function () {
                form.hidden    = true;
                success.hidden = false;
            } )
            .catch( function () {
                errEl.textContent = 'Something went wrong. Please try again.';
                errEl.hidden      = false;
                btn.disabled      = false;
            } );
        } );
    } );
} );
