#import "CorHttpd.h"
#import "MyWebSocket.h"
#import "HTTPLogging.h"
#import "guid.h"

// Log levels: off, error, warn, info, verbose
// Other flags : trace
static const int httpLogLevel = HTTP_LOG_LEVEL_WARN | HTTP_LOG_FLAG_TRACE;


@implementation MyWebSocket

- (void)didOpen
{
	HTTPLogTrace();
	
	[super didOpen];
    
    self.uid = [[Guid randomGuid] stringValue];
    CorHttpd* instance = [CorHttpd getInstance];
    instance.sockets[self.uid] = self;
    NSString* sendInfo = [NSString stringWithFormat:@"httpd.socket.connect('%@')", self.uid];
    [instance.webView performSelectorOnMainThread:@selector(stringByEvaluatingJavaScriptFromString:) withObject:sendInfo waitUntilDone:NO];
}

- (void)didReceiveMessage:(NSString *)msg
{
	HTTPLogTrace2(@"%@[%p]: didReceiveMessage: %@", THIS_FILE, self, msg);
    
    CorHttpd* instance = [CorHttpd getInstance];
    NSString* sendInfo = [NSString stringWithFormat:@"httpd.socket.receive('%@', '%@')", self.uid, msg];
    HTTPLogTrace2(@"%@[%p]: sending to plugin: %@", THIS_FILE, self, sendInfo);
    [instance.webView performSelectorOnMainThread:@selector(stringByEvaluatingJavaScriptFromString:) withObject:sendInfo waitUntilDone:NO];
}

- (void)didClose
{
	HTTPLogTrace();
	
	[super didClose];
    
    CorHttpd* instance = [CorHttpd getInstance];
    [instance.sockets removeObjectForKey:self.uid];
    NSString* sendInfo = [NSString stringWithFormat:@"httpd.socket.disconnect('%@')", self.uid];
    [instance.webView performSelectorOnMainThread:@selector(stringByEvaluatingJavaScriptFromString:) withObject:sendInfo waitUntilDone:NO];
}

@end
