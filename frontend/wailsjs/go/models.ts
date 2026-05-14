export namespace system {
	
	export class VersionEntry {
	    version: string;
	    firstSeenAt: string;
	
	    static createFrom(source: any = {}) {
	        return new VersionEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.firstSeenAt = source["firstSeenAt"];
	    }
	}
	export class SystemInfo {
	    version: string;
	    commit: string;
	    buildDate: string;
	    installedAt: string;
	    lastOpenedAt: string;
	    launchCount: number;
	    dataDir: string;
	    os: string;
	    arch: string;
	    versionHistory: VersionEntry[];
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.commit = source["commit"];
	        this.buildDate = source["buildDate"];
	        this.installedAt = source["installedAt"];
	        this.lastOpenedAt = source["lastOpenedAt"];
	        this.launchCount = source["launchCount"];
	        this.dataDir = source["dataDir"];
	        this.os = source["os"];
	        this.arch = source["arch"];
	        this.versionHistory = this.convertValues(source["versionHistory"], VersionEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace updater {
	
	export class PlatformAsset {
	    url: string;
	    size: number;
	    sha256: string;
	
	    static createFrom(source: any = {}) {
	        return new PlatformAsset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.size = source["size"];
	        this.sha256 = source["sha256"];
	    }
	}
	export class UpdateState {
	    currentVersion: string;
	    latestVersion: string;
	    updateAvailable: boolean;
	    asset?: PlatformAsset;
	    releaseNotesUrl?: string;
	    // Go type: time
	    checkedAt: any;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.updateAvailable = source["updateAvailable"];
	        this.asset = this.convertValues(source["asset"], PlatformAsset);
	        this.releaseNotesUrl = source["releaseNotesUrl"];
	        this.checkedAt = this.convertValues(source["checkedAt"], null);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

