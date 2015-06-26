#import <Cordova/CDV.h>

#import "DDLog.h"
#import "DDTTYLogger.h"
#import "HTTPServer.h"
#import "MyWebSocket.h"

@interface CorHttpd : CDVPlugin {
    // Member variables go here.

}

@property(nonatomic, retain) HTTPServer *httpServer;
@property(nonatomic, retain) NSMutableDictionary *sockets;
@property(nonatomic, retain) NSString *localPath;
@property(nonatomic, retain) NSString *url;

@property (nonatomic, retain) NSString* www_root;
@property (assign) int port;
@property (assign) BOOL localhost_only;

+ (CorHttpd*)getInstance;

- (void)startServer:(CDVInvokedUrlCommand*)command;
- (void)stopServer:(CDVInvokedUrlCommand*)command;
- (void)getURL:(CDVInvokedUrlCommand*)command;
- (void)getLocalPath:(CDVInvokedUrlCommand*)command;

- (NSDictionary *)getIPAddresses;
- (NSString *)getIPAddress:(BOOL)preferIPv4;

@end