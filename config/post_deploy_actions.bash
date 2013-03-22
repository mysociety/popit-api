mkdir -p ../node
NODE_DIR=`(cd ../node && pwd)`

if [ ! -e ../node/bin/npm ]; then
    mkdir -p ../node-src
    cd ../node-src
    curl http://nodejs.org/dist/v0.8.22/node-v0.8.22.tar.gz | tar xz --strip-components=1
    ./configure --prefix=$NODE_DIR
    make install
    cd -
fi

export PATH=$NODE_DIR/bin:$PATH


# Run the install each time. This will just check that the packages needed are
# present, won't check for the latest (or later) versions if deps are satisfied.
npm install --quiet

# Specifically check for and then install the latest popit-api. This is most
# likely the reason that the deploy is being done. If a specific version of
# popit is required then something smarter will need to be used.
npm install --quiet popit-api@latest

# clear out anything that is not needed
npm prune
