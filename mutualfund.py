class MutualFund:
    def __init__(self, code, names, mf_data):
        # int
        self.code = code
        # array of type string
        self.names = names
        # dict of datetime.date vs MFData
        self.mf_data = mf_data

    def __repr__(self):
        return "mutualfund.MutualFund(" + repr(self.code) + ", " + \
                                          repr(self.names) + ", " + \
                                          repr(self.mf_data) + ")"

class MFData:
    def __init__(self, nav, one_year_ret=None, three_year_ret=None, five_year_ret=None):
        # float
        self.nav = nav
        # float
        self.one_year_ret = one_year_ret
        # float
        self.three_year_ret = three_year_ret
        # float
        self.five_year_ret = five_year_ret

    def __repr__(self):
        return "mutualfund.MFData(" + repr(self.nav) + ", " + \
                                      repr(self.one_year_ret) + ", " + \
                                      repr(self.three_year_ret) + ", " + \
                                      repr(self.five_year_ret) + ")"
