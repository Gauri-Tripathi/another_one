const {spawnSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
if(process.platform!=='darwin'){console.error('Build the macOS native helper on a Mac with Xcode Command Line Tools installed.');process.exit(1);}
const root=path.resolve(__dirname,'..'),out=path.join(root,'build','mac');
fs.mkdirSync(out,{recursive:true});
function run(command,args){const result=spawnSync(command,args,{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error(command+' failed with status '+result.status);}
// Both slices in one helper: either Intel or Apple Silicon app can launch it.
for(const arch of ['arm64','x86_64'])run('/usr/bin/xcrun',['swiftc','-O','-target',arch+'-apple-macos13.0','-framework','AppKit','-framework','ApplicationServices',path.join(root,'electron','mac','Foreground.swift'),'-o',path.join(out,'foreground-'+arch)]);
run('/usr/bin/lipo',['-create',path.join(out,'foreground-arm64'),path.join(out,'foreground-x86_64'),'-output',path.join(out,'purrductive-foreground')]);
fs.chmodSync(path.join(out,'purrductive-foreground'),0o755);
// -verify_arch consumes every remaining argument as an architecture name.
// The input filename must precede it, otherwise lipo parses the path as an arch.
run('/usr/bin/lipo',[path.join(out,'purrductive-foreground'),'-verify_arch','arm64','x86_64']);
