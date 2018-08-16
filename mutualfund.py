class MutualFund:
    def __init__(self, code, names, navs):
        self.code = code
        self.names = names
        self.navs = navs

    def __repr__(self):
        return "mutualfund.MutualFund(" + repr(self.code) + ", " + repr(self.names) + ", " + repr(self.navs) + ")"
