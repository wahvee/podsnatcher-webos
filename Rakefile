require 'rake'
require 'fileutils'
require 'json'

PALM_SDK = "/opt/PalmSDK/Current/bin/"
PALM_SDK_BINARIES = %w[ palm-emulator palm-help palm-launch palm-package palm-worm palm-generate palm-install palm-log palm-run ]
PALM_SDK_BINARIES.map! { |bin| PALM_SDK + bin }
INDEX_PATH = File.expand_path "src/index.html"

DEBUG_FRAMEWORK_CONFIG = {
  :debuggingEnabled => true,
  :escapeHTMLInTemplates => true,
  :logEvents => true,
  :logLevel => 99,
  :timingEnabled => true,
  :useNativeJSONParser => true
}

RELEASE_FRAMEWORK_CONFIG = {
  :debuggingEnabled => false,
  :escapeHTMLInTemplates => true,
  :logEvents => false,
  :logLevel => 0,
  :timingEnabled => false,
  :useNativeJSONParser => true
}

desc "Makes sure that the PalmSDK is installed"
task :sdk? do
  PALM_SDK_BINARIES.each do |bin|
    raise "PalmSDK is not properly installed." unless File.exists? bin
  end
end

desc "Build the source in some context, e.g., rake build[Debug]."
task :build, :context do |cmd, args|
  Rake::Task[:sdk?]
  build_output_dir = File.expand_path "bin/#{args[:context]}"
  FileUtils.mkdir_p build_output_dir unless File.exists? build_output_dir
  `palm-package --outdir="#{build_output_dir}" --exclude="resources" src` =~ /((\b\S*(?=_\d))\S*\b)/i
  IPK_FILE = [build_output_dir, $1].join "/"
  APP_ID = $2
end

namespace :install do
  desc "Install *.ipk on the device, e.g., rake install:device[Debug]"
  task :device, :context do |cmd, args|
    Rake::Task[:build].invoke(args[:context])
    `palm-install -d usb #{IPK_FILE}`
  end

  desc "Install *.ipk on the emulator, e.g., rake install:emulator[Debug]"
  task :emulator, :context do |cmd, args|
    Rake::Task[:build].invoke(args[:context])
    `palm-install -d tcp #{IPK_FILE}`
  end
end

namespace :launch do
  desc "Lauch on device, e.g., rake launch:device[Debug]"
  task :device, :context do |cmd, args|
    Rake::Task["install:device"].invoke(args[:context])
  end

  desc "Lauch in emulator, e.g., rake launch:emulator[Debug]"
  task :emulator, :context do |cmd, args|
    Rake::Task["install:emulator"].invoke(args[:context])
    framework_config = args[:context] =~ /debug/i ? DEBUG_FRAMEWORK_CONFIG : RELEASE_FRAMEWORK_CONFIG
    puts framework_config.to_json
    `palm-launch -p #{framework_config.to_json} #{APP_ID}`
  end

  desc "Launch in Webkit browser, e.g., rake launch:webkit[Safari]."
  task :webkit, :browser do |cmd, args|
    `google-chrome --disable-web-security --enable-file-cookies #{INDEX_PATH}`
  end
end

task :default => "launch:webkit"
