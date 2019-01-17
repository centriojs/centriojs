'use strict';

const _ = require('../mixin');

const findTermParent = async (slugs, ID, typeId) => {
    let term = await getTerm( typeId, ID ).catch(errorHandler);

    if ( term.parent && term.parent > 0 ) {
        slugs = await findTermParent( slugs, term.parent, typeId );
    }

    slugs.push(term.slug);

    return slugs;
};

const updatedContentType3 = async (typeId, contentType, oldType) => {
    if ( 'tax' === contentType.type ) {
        return false;
    }

    if ( contentType.slug === oldType.slug ) {
        return true;
    }

    let taxTypes = await getTypeProperties({name: 'content_type', value: typeId});
    taxTypes = _.pluck( taxTypes, 'objectId' );

    taxTypes.map( async taxId => {
        let terms = await getTerms({
            termsOf: typeId,
            typeId: taxId
        });

        if ( ! terms.length ) {
            return;
        }

        terms.map( async term => {
            let oldSlug = await findTermParent( [oldType.slug], term.ID, taxId );
            oldSlug = '/' + oldSlug.join('/');

            let newSlug = await findTermParent( [contentType.slug], term.ID, taxId );
            newSlug = '/' + newSlug.join('/');

            setEndPoint( newSlug, {
                type: 'taxPage',
                typeId: typeId,
                taxTypeId: taxId,
                termId: term.ID
            }, oldSlug ).catch(errorHandler);
        });
    });
};
appEvent.on( 'updatedContentType', updatedContentType3 );

// Delete terms endpoint when a content type of type content is deleted
const deletedContentType3 = async (typeId, contentType) => {
    if ( 'tax' === contentType.type ) {
        return true;
    }

    let taxTypes = await getTypeProperties({name: 'content_type', value: typeId} );
    taxTypes = _.pluck( taxTypes, 'objectId' );

    taxTypes.map( async taxId => {
        let terms = await getTerms({
            typeId: taxId,
            termsOf: typeId
        });

        if ( ! terms.length ) {
            return false;
        }

        terms.map( term => {
            let slugs = findTermParent( [contentType.slug], term.ID, taxId );
            slugs = '/' + slugs.join('/');

            deleteEndPoint(slugs).catch(errorHandler);
        });
    });

    return true;
};
appEvent.on( 'deletedContentType', deletedContentType3 );

const insertedTerm = async (termId, termTypeId) => {
    let contentTypes = await getTypeProperty( termTypeId, 'content_type' );
    if ( ! contentTypes || ! contentTypes.length ) {
        return false;
    }

    contentTypes.map( async id => {
        let type = await getContentType(id).catch(errorHandler);

        if ( ! type || type.error ) {
            return false; // Bail content type was deleted
        }

        let newSlugs = await findTermParent( [type.slug], termId, termTypeId );
        newSlugs = '/' + newSlugs.join('/');

        await setEndPoint( newSlugs, {
            type: 'taxPage',
            typeId: type.ID,
            termTypeId: termTypeId,
            termId: termId
        }, ).catch(errorHandler);
    });

    return true;
};
appEvent.on( 'insertedTerm', insertedTerm, 9999 );

const updatedTerm = async (termId, termTypeId, old) => {
    let term = await getTerm( termTypeId, termId ).catch(errorHandler);

    if ( term.slug === old.slug ) {
        return false;
    }

    let contentTypes = await getTypeProperty( termTypeId, 'content_type' );
    if ( ! contentTypes || ! contentTypes.length ) {
        return false;
    }

    contentTypes.map( async id => {
        let type = await getContentType(id).catch(errorHandler);

        if ( ! type || type.error ) {
            return false; // Bail content type was deleted
        }

        let slugs = await findTermParent( [type.slug], termId, termTypeId ),
            newSlugs = '/' + slugs.join('/'),
            oldSlugs = slugs;

        // Remove the last slug
        oldSlugs.pop();
        oldSlugs.push(term.slug);
        oldSlugs = '/' + oldSlugs.join('/');

        await setEndPoint( newSlugs, {
            type: 'taxPage',
            typeId: type.ID,
            termTypeId: termTypeId,
            termId: termId
        }, oldSlugs ).catch(errorHandler);
    });

    return true;
};
appEvent.on( 'updatedTerm', updatedTerm, 999 );

const deletedTerm = async (termId, termTypeId) => {
    // Delete term properties
    await deleteContentProperty( termTypeId, termId ).catch(errorHandler);
};
appEvent.on( 'deletedTerm', deletedTerm, 999 );

const setContentTerm = async ( contentTypeId, termTypeId, contentId, termIds ) => {
    let termType = await getContentType(termTypeId).catch(errorHandler);
    if ( ! termType.hasPage ) {
        return false;
    }

    let contentType = await getContentType(contentTypeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return false;
    }

    termIds.map( async termId => {
        let term = await getTerm( termTypeId, termId ).catch(errorHandler);

        if ( ! term || term.error ) {
            return false;
        }

        let slugs = await findTermParent( [contentType.slug, termType.slug], termId, termTypeId );
        slugs = '/' + slugs.join('/');

        let value = {
            type: 'termPage',
            typeId: contentTypeId,
            termTypeId: termTypeId,
            termId: termId
        };

        setEndPoint( slugs, value ).catch(errorHandler);
    });

    return true;
};
appEvent.on( 'setContentTerm', setContentTerm );

const deletedContentTerm = async ( contentTypeId, termTypeId, contentId, termIds ) => {
    let termType = await getContentType(termTypeId).catch(errorHandler);

    if ( ! termType.hasPage ) {
        return false;
    }

    let contentType = await getContentType(contentTypeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return false;
    }

    termIds.map( async termId => {
        let term = await getTerm( termTypeId, termId ).catch(errorHandler);

        if ( ! term || term.error ) {
            return false;
        }

        let slugs = await findTermParent( [contentType.slug, termType.slug], termId, termTypeId );
        slugs = '/' + slugs.join('/');

        deleteEndPoint(slugs).catch(errorHandler);
    });

    return true;
};
appEvent.on( 'deletedContentTerm', deletedContentTerm );