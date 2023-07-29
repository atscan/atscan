#!/bin/bash
cd $1
echo $4
mkdir -p $4
#tar --zstd -cf $3.tar.zst $2
#sha256sum $3.tar.zst > $3.tar.zst.sha256
tar --gzip -cf $3.tar.gz $2
sha256sum $3.tar.gz > $3.tar.gz.sha256
mv $3* $4